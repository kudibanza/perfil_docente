export const mainFunctionLabels: Record<string, string> = {
  DOCENTE: "Docente",
  INVESTIGADOR: "Investigador",
  FUNCIONARIO_ADMINISTRATIVO: "Funcionário Administrativo",
};

export const profileCategoryLabels: Record<string, string> = {
  ASSISTENTE_ESTAGIARIO: "Assistente Estagiário",
  ASSISTENTE: "Assistente",
  PROFESSOR_AUXILIAR: "Professor Auxiliar",
  PROFESSOR_ASSOCIADO: "Professor Associado",
  PROFESSOR_CATEDRATICO: "Professor Catedrático",
  ESTAGIARIO_INVESTIGACAO: "Estagiário de Investigação",
  ASSISTENTE_INVESTIGACAO: "Assistente de Investigação",
  INVESTIGADOR_AUXILIAR: "Investigador Auxiliar",
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  TECNICO_SUPERIOR: "Técnico Superior",
  TECNICO_MEDIO: "Técnico Médio",
  TECNICO_BASE: "Técnico de Base",
};

export const profilePositionLabels: Record<string, string> = {
  DIRECTOR: "Director",
  DIRECTOR_ADJUNTO: "Director Adjunto",
  CHEFE_DEPARTAMENTO: "Chefe de Departamento",
  CHEFE_SECCAO: "Chefe de Secção",
  CHEFE_CENTRO: "Chefe do Centro",
  DOCENTE: "Docente",
  TECNICO: "Técnico",
};

export const publicationStatusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  INACTIVE: "Inativo",
};

export const degreeLevelLabels: Record<string, string> = {
  LICENCIATURA: "Licenciatura",
  MESTRADO: "Mestrado",
  DOUTORAMENTO: "Doutoramento",
};

export const publicationTypeLabels: Record<string, string> = {
  BOOK: "Livro",
  ARTICLE: "Artigo",
  OTHER: "Outro",
};

export function enumLabel(value: string, labels: Record<string, string>) {
  return labels[value] ?? value.replaceAll("_", " ");
}
