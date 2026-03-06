// CPF mask: 000.000.000-00
export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Clean CPF (remove non-digits)
export function cleanCPF(value: string): string {
  return value.replace(/\D/g, '');
}

// Validate CPF
export function validateCPF(cpf: string): boolean {
  cpf = cleanCPF(cpf);
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Phone mask: (00) 00000-0000
export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

// CEP mask: 00000-000
export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

// RG mask: general format
export function maskRG(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

// Date mask: DD/MM/YYYY
export function maskDate(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
}

// Passport mask: AA0000000
export function maskPassport(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

// Format date for display
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

// Format datetime for display
export function formatDateTime(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}

// Brazilian states
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// Sex options
export const SEX_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
];

// Race/Color options
export const RACE_OPTIONS = [
  { value: 'branca', label: 'Branca' },
  { value: 'preta', label: 'Preta' },
  { value: 'parda', label: 'Parda' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
];

// Marital status options
export const MARITAL_STATUS_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

// Certificate type options
export const CERTIFICATE_TYPE_OPTIONS = [
  { value: 'nascimento', label: 'Nascimento' },
  { value: 'casamento', label: 'Casamento' },
];

// Certificate model options
export const CERTIFICATE_MODEL_OPTIONS = [
  { value: 'novo', label: 'Modelo Novo' },
  { value: 'antigo', label: 'Modelo Antigo' },
];

// Passport type options
export const PASSPORT_TYPE_OPTIONS = [
  { value: 'comum', label: 'Passaporte Comum' },
  { value: 'oficial', label: 'Passaporte Oficial' },
  { value: 'diplomatico', label: 'Passaporte Diplomático' },
];

// Issuing bodies
export const ISSUING_BODIES = [
  { value: 'SSP', label: 'SSP - Secretaria de Segurança Pública' },
  { value: 'PC', label: 'PC - Polícia Civil' },
  { value: 'PF', label: 'PF - Polícia Federal' },
  { value: 'DETRAN', label: 'DETRAN' },
  { value: 'CRC', label: 'CRC - Conselho Regional de Contabilidade' },
  { value: 'CREA', label: 'CREA - Conselho Regional de Engenharia' },
  { value: 'CRM', label: 'CRM - Conselho Regional de Medicina' },
  { value: 'OAB', label: 'OAB - Ordem dos Advogados do Brasil' },
  { value: 'OUTRO', label: 'Outro' },
];
