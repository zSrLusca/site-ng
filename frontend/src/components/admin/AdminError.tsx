import { formatApiError } from "../../api";

export function AdminError({ error }: { error: unknown }) {
  if (!error) return null;
  const { message, details } = typeof error === "string"
    ? { message: error, details: [] as string[] }
    : formatApiError(error);
  const extra = details.filter((d) => d && d !== message);
  return (
    <div className="admin-error" role="alert">
      <strong>Não foi possível salvar</strong>
      <p>{message}</p>
      {extra.length > 0 && (
        <ul>
          {extra.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
