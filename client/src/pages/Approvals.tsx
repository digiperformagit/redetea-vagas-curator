import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, Trash2, Search, Building2, MapPin, Tag, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

const SOURCE_LABELS: Record<string, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  glassdoor: "Glassdoor",
  catho: "Catho",
  llm_generated: "Gerada",
};

const SOURCE_COLORS: Record<string, string> = {
  indeed: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  glassdoor: "bg-green-100 text-green-800",
  catho: "bg-orange-100 text-orange-800",
  llm_generated: "bg-purple-100 text-purple-800",
};

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [searchText, setSearchText] = useState("");

  const statsQuery = trpc.jobs.stats.useQuery();
  const listQuery = trpc.jobs.list.useQuery({
    status: ["pending", "approved", "rejected", "published"],
    limit: 200,
  });
  const deleteJobMutation = trpc.jobs.delete.useMutation();
  const rejectMutation = trpc.jobs.reject.useMutation();

  const filterJobs = (jobs: any[]) => {
    if (!searchText) return jobs;
    const q = searchText.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q) ||
        j.categories?.some((c: string) => c.toLowerCase().includes(q))
    );
  };

  const allJobs = listQuery.data || [];
  const pendingJobs = filterJobs(allJobs.filter((j) => j.status === "pending"));
  const approvedJobs = filterJobs(allJobs.filter((j) => j.status === "approved"));
  const rejectedJobs = filterJobs(allJobs.filter((j) => j.status === "rejected"));
  const publishedJobs = filterJobs(allJobs.filter((j) => j.status === "published"));

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar esta vaga?")) return;
    try {
      await deleteJobMutation.mutateAsync({ id });
      toast.success("Vaga deletada");
      listQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error("Erro ao deletar vaga");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Rejeitar esta vaga?")) return;
    try {
      await rejectMutation.mutateAsync({ id });
      toast.success("Vaga rejeitada");
      listQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error("Erro ao rejeitar vaga");
    }
  };

  const handleReview = (jobId: number) => {
    setLocation(`/review/${jobId}`);
  };

  const JobCard = ({ job }: { job: any }) => (
    <Card className="p-5 mb-3 hover:shadow-md transition-all border border-slate-200 hover:border-blue-200">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-slate-900 text-base leading-tight">
              {job.title}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                SOURCE_COLORS[job.source] || "bg-gray-100 text-gray-700"
              }`}
            >
              {SOURCE_LABELS[job.source] || job.source}
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{job.company}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3">
            {(job.city || job.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[job.city, job.state].filter(Boolean).join(" - ")}
              </span>
            )}
            {job.categories?.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {job.categories.slice(0, 2).join(", ")}
                {job.categories.length > 2 && ` +${job.categories.length - 2}`}
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {job.description}
            </p>
          )}

          {job.wpPostId && (
            <div className="mt-2">
              <a
                href={`https://redetea.com.br/?p=${job.wpPostId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Ver no WordPress (ID: {job.wpPostId})
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReview(job.id)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 mr-1" />
            Revisar
          </Button>
          {job.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReject(job.id)}
              disabled={rejectMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Rejeitar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(job.id)}
            disabled={deleteJobMutation.isPending}
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Aprovações de Vagas
          </h1>
          <p className="text-slate-500 text-sm">
            Gerencie o status de todas as vagas encontradas
          </p>
        </div>

        {/* Stats */}
        {statsQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Pendentes", value: statsQuery.data.pending, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
              { label: "Aprovadas", value: statsQuery.data.approved, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
              { label: "Rejeitadas", value: statsQuery.data.rejected, color: "text-red-600", bg: "bg-red-50 border-red-200" },
              { label: "Publicadas", value: statsQuery.data.published, color: "text-green-600", bg: "bg-green-50 border-green-200" },
            ].map((stat) => (
              <Card key={stat.label} className={`p-4 text-center border ${stat.bg}`}>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-slate-600 mt-0.5">{stat.label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cargo, empresa ou cidade..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pending">
              Pendentes
              {pendingJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{pendingJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovadas
              {approvedJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{approvedJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejeitadas
              {rejectedJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{rejectedJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="published">
              Publicadas
              {publishedJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{publishedJobs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingJobs.length === 0 ? (
              <EmptyState message="Nenhuma vaga pendente de aprovação" />
            ) : (
              pendingJobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedJobs.length === 0 ? (
              <EmptyState message="Nenhuma vaga aprovada ainda" />
            ) : (
              approvedJobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedJobs.length === 0 ? (
              <EmptyState message="Nenhuma vaga rejeitada" />
            ) : (
              rejectedJobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>

          <TabsContent value="published">
            {publishedJobs.length === 0 ? (
              <EmptyState message="Nenhuma vaga publicada ainda" />
            ) : (
              publishedJobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
