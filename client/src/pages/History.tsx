import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink, Trash2, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function History() {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);

  const historyQuery = trpc.jobs.history.useQuery({
    page: currentPage,
    perPage,
  });

  const credentialsQuery = trpc.wpCredentials.get.useQuery();
  const deleteMutation = trpc.jobs.deleteFromWordPress.useMutation();

  const handleDeleteJob = async (postId: number, title: string) => {
    if (!confirm(`Tem certeza que deseja remover "${title}" do WordPress?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ postId });
      toast.success("Vaga removida com sucesso");
      historyQuery.refetch();
    } catch (error) {
      toast.error("Erro ao remover vaga");
    }
  };

  const getEditUrl = (postId: number) => {
    if (!credentialsQuery.data?.wpUrl) return null;
    const baseUrl = credentialsQuery.data.wpUrl.replace(/\/$/, "");
    return `${baseUrl}/wp-admin/post.php?post=${postId}&action=edit`;
  };

  if (historyQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (historyQuery.error) {
    return (
      <div className="p-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Erro ao carregar histórico</h3>
          <p className="text-red-800 text-sm">
            {historyQuery.error.message || "Não foi possível conectar ao WordPress"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => historyQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const data = historyQuery.data;
  const posts = data?.posts || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Histórico de Vagas</h1>
        <p className="text-slate-600">
          Total de {total} vaga{total !== 1 ? "s" : ""} publicada{total !== 1 ? "s" : ""} no WordPress
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-600 mb-4">Nenhuma vaga publicada ainda</p>
          <p className="text-sm text-slate-500">
            As vagas que você aprovar aparecerão aqui
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 mb-8">
            {posts.map((post: any) => {
              const editUrl = getEditUrl(post.id);
              return (
                <Card key={post.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">
                          {post.title}
                        </h3>
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {post.status}
                        </span>
                      </div>

                      {post.meta?.company && (
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Empresa:</strong> {post.meta.company}
                        </p>
                      )}

                      {post.meta?.city && post.meta?.state && (
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Local:</strong> {post.meta.city}, {post.meta.state}
                        </p>
                      )}

                      {post.meta?.email && (
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>E-mail:</strong> {post.meta.email}
                        </p>
                      )}

                      {post.meta?.phone && (
                        <p className="text-sm text-slate-600 mb-3">
                          <strong>Telefone:</strong> {post.meta.phone}
                        </p>
                      )}

                      <div className="text-xs text-slate-500">
                        Publicado em{" "}
                        {new Date(post.date).toLocaleDateString("pt-BR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={post.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Ver
                        </a>
                      </Button>

                      {editUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <a href={editUrl} target="_blank" rel="noopener noreferrer">
                            <Edit className="h-4 w-4" />
                            Editar
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteJob(post.id, post.title)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Paginação */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Página {currentPage} de {pages}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pages}
                  onClick={() => setCurrentPage(Math.min(pages, currentPage + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
