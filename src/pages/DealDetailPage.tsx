import { useParams } from "react-router-dom";

export function DealDetailPage() {
  const { dealId } = useParams();
  return (
    <div>
      <h2 className="text-2xl font-semibold">Deal detail</h2>
      <p className="mt-2 text-muted-foreground">Deal ID: {dealId}</p>
    </div>
  );
}
