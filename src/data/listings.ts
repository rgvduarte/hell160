// Casas de exemplo para o protótipo do alojamento comunitário.
// Em produção estes registos vêm do onboarding de anfitriões (/alojamento/anfitriao).

export type Listing = {
  id: string
  title: string
  village: string
  host: string
  hostSince: number
  sleeps: number
  bedrooms: number
  eurNight: number
  kmToStart: number
  features: string[]
  note: string
  // padrão gráfico (sem fotografias até haver sessão fotográfica real)
  tone: 'cal' | 'ocre' | 'terra' | 'noite'
}

export const VILLAGES = [
  'A-do-Pinto',
  'Serpa',
  'Brinches',
  'Pias',
  'Vale de Vargo',
  'Vila Nova de São Bento',
  'Vila Verde de Ficalho',
] as const

export const FEATURES = {
  ac: 'Ar condicionado',
  bike: 'Garagem para bicicletas',
  breakfast: 'Pequeno-almoço',
  wash: 'Máquina de lavar',
  late: 'Check-in de madrugada',
  shuttle: 'Boleia até à partida',
  patio: 'Quintal / sombra',
  family: 'Berço disponível',
} as const

export type FeatureKey = keyof typeof FEATURES

export const LISTINGS: Listing[] = [
  { id: 'adp-01', title: 'Casa da Rua Direita', village: 'A-do-Pinto', host: 'Maria José', hostSince: 2027, sleeps: 4, bedrooms: 2, eurNight: 70, kmToStart: 0.3, features: ['ac', 'late', 'patio', 'wash'], note: 'A 300 m do pavilhão. Ouve-se a partida do quintal.', tone: 'cal' },
  { id: 'adp-02', title: 'Monte do Pinto', village: 'A-do-Pinto', host: 'Joaquim', hostSince: 2027, sleeps: 6, bedrooms: 3, eurNight: 80, kmToStart: 1.2, features: ['ac', 'bike', 'breakfast', 'patio', 'family'], note: 'Monte recuperado, com alpendre e sombra de oliveira.', tone: 'ocre' },
  { id: 'adp-03', title: 'Quarto da Tia Rosa', village: 'A-do-Pinto', host: 'Rosa', hostSince: 2027, sleeps: 2, bedrooms: 1, eurNight: 50, kmToStart: 0.5, features: ['ac', 'breakfast', 'late'], note: 'Quarto independente com entrada própria.', tone: 'terra' },
  { id: 'srp-01', title: 'Casa do Arco', village: 'Serpa', host: 'António', hostSince: 2027, sleeps: 5, bedrooms: 2, eurNight: 75, kmToStart: 14, features: ['ac', 'wash', 'shuttle', 'family'], note: 'Dentro das muralhas. Boleia ao pavilhão na sexta à noite.', tone: 'cal' },
  { id: 'srp-02', title: 'Sótão da Praça', village: 'Serpa', host: 'Helena', hostSince: 2027, sleeps: 2, bedrooms: 1, eurNight: 60, kmToStart: 14, features: ['ac', 'breakfast'], note: 'Pequeno, fresco, por cima da pastelaria.', tone: 'noite' },
  { id: 'brn-01', title: 'Casa Caiada', village: 'Brinches', host: 'Manuel', hostSince: 2027, sleeps: 4, bedrooms: 2, eurNight: 60, kmToStart: 9, features: ['ac', 'bike', 'patio', 'shuttle'], note: 'A aldeia está no percurso: dá para apoiar a passagem ao km 119.', tone: 'ocre' },
  { id: 'brn-02', title: 'Casa da Eira', village: 'Brinches', host: 'Conceição', hostSince: 2027, sleeps: 8, bedrooms: 4, eurNight: 80, kmToStart: 9, features: ['ac', 'wash', 'patio', 'family', 'bike'], note: 'Para equipas de estafeta. Quatro quartos, uma mesa grande.', tone: 'terra' },
  { id: 'pia-01', title: 'Rés-do-chão da Estrada', village: 'Pias', host: 'Francisco', hostSince: 2027, sleeps: 3, bedrooms: 1, eurNight: 55, kmToStart: 12, features: ['ac', 'late'], note: 'Simples e limpo. Chave em cofre para chegadas tardias.', tone: 'cal' },
  { id: 'pia-02', title: 'Casa do Lagar', village: 'Pias', host: 'Ana Paula', hostSince: 2027, sleeps: 6, bedrooms: 3, eurNight: 75, kmToStart: 12, features: ['ac', 'breakfast', 'patio', 'wash'], note: 'Antigo lagar de azeite, paredes de 60 cm. Fresca em julho.', tone: 'noite' },
  { id: 'vvg-01', title: 'Casa do Largo', village: 'Vale de Vargo', host: 'José Carlos', hostSince: 2027, sleeps: 4, bedrooms: 2, eurNight: 55, kmToStart: 8, features: ['ac', 'bike', 'shuttle'], note: 'Primeiro abastecimento é aqui ao lado.', tone: 'ocre' },
  { id: 'vnsb-01', title: 'Casa das Laranjeiras', village: 'Vila Nova de São Bento', host: 'Fátima', hostSince: 2027, sleeps: 5, bedrooms: 2, eurNight: 65, kmToStart: 10, features: ['ac', 'patio', 'family', 'breakfast'], note: 'Quintal com laranjeiras e tanque.', tone: 'terra' },
  { id: 'vvf-01', title: 'Casa da Fronteira', village: 'Vila Verde de Ficalho', host: 'Luís', hostSince: 2027, sleeps: 4, bedrooms: 2, eurNight: 60, kmToStart: 22, features: ['ac', 'bike', 'wash'], note: 'Junto à fronteira. Base de vida 1 na aldeia.', tone: 'cal' },
]

export const listingById = (id: string) => LISTINGS.find((l) => l.id === id)

// Noites do fim de semana da prova
export const EVENT_NIGHTS = [
  { iso: '2027-07-01', label: 'Qui 1 jul', note: 'Levantamento de dorsais' },
  { iso: '2027-07-02', label: 'Sex 2 jul', note: 'Partida HELL160 às 22:00' },
  { iso: '2027-07-03', label: 'Sáb 3 jul', note: 'HELL100 · prova a decorrer' },
  { iso: '2027-07-04', label: 'Dom 4 jul', note: 'Chegadas · fecho às 10:00' },
]

export const PLATFORM_FEE = 0.08
