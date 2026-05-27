import { useParams } from "react-router-dom";

export function ClientDetailPage() {
  const { clientId } = useParams();
  return (
    <div>
      <h2 className="text-2xl font-semibold">Client detail</h2>
      <p className="mt-2 text-muted-foreground">Client ID: {clientId}</p>
    </div>
  );
}
