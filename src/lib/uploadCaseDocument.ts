import { supabase } from "@/integrations/supabase/client";

/**
 * Faz o upload de um documento para o bucket 'case-documents'.
 * @param file O arquivo a ser upado.
 * @param caseId O ID do caso (processo).
 * @param userId O ID do usuário logado.
 * @returns O caminho (path) relativo do arquivo no bucket.
 */
export async function uploadCaseDocument(
  file: File,
  caseId: string,
  userId: string,
): Promise<string> {
  try {
    if (!file) {
      throw new Error("Arquivo não fornecido.");
    }

    // Validação básica de tamanho: máximo de 50MB
    if (file.size > 50 * 1024 * 1024) {
      throw new Error("O arquivo excede o limite de tamanho permitido (50MB).");
    }

    // Sanitiza o nome do arquivo para remover caracteres problemáticos
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // Gera o caminho: userId/caseId/timestamp_nome
    const filePath = `${userId}/${caseId}/${Date.now()}_${sanitizedName}`;

    const { data, error } = await supabase.storage.from("case-documents").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("Erro no upload (Supabase):", error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error("O caminho do arquivo não foi retornado pelo servidor.");
    }

    return data.path;
  } catch (error: unknown) {
    console.error("Exceção ao fazer upload do documento do caso:", error);
    throw error;
  }
}
