import { TelaDetalhe } from "@/components/catalogo/tela-detalhe";

export default async function PaginaDetalhe({
  params,
}: Readonly<{ params: Promise<{ patrimonio: string }> }>) {
  const { patrimonio } = await params;
  return <TelaDetalhe patrimonio={patrimonio} />;
}
