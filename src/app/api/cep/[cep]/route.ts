import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  try {
    const { cep } = await params;

    // Remove non-digit characters
    const cleanCep = cep.replace(/\D/g, '');

    // Validate CEP format (8 digits)
    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP inválido. O CEP deve conter 8 dígitos.' },
        { status: 400 }
      );
    }

    // Fetch from ViaCEP API
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao consultar o CEP. Tente novamente.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // ViaCEP returns { erro: true } when CEP is not found
    if (data.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado. Verifique o número digitado.' },
        { status: 404 }
      );
    }

    // Return only the fields we need
    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
    });
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar o CEP. Tente novamente.' },
      { status: 500 }
    );
  }
}
