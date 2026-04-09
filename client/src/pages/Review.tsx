import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Check, X, Save, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { JOB_CATEGORIES, JOB_LOCATIONS } from "@shared/constants";

export default function Review() {
  const params = useParams();
  const jobId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const getJobQuery = trpc.jobs.get.useQuery({ id: jobId }, { enabled: !!jobId });
  const updateJobMutation = trpc.jobs.update.useMutation();
  const approveMutation = trpc.jobs.approve.useMutation();
  const rejectMutation = trpc.jobs.reject.useMutation();

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    description: "",
    city: "",
    state: "",
    address: "",
    zipCode: "",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    categories: [] as string[],
    locations: [] as string[],
  });

  useEffect(() => {
    if (getJobQuery.data) {
      setFormData({
        title: getJobQuery.data.title || "",
        company: getJobQuery.data.company || "",
        description: getJobQuery.data.description || "",
        city: getJobQuery.data.city || "",
        state: getJobQuery.data.state || "",
        address: getJobQuery.data.address || "",
        zipCode: getJobQuery.data.zipCode || "",
        email: getJobQuery.data.email || "",
        phone: getJobQuery.data.phone || "",
        website: getJobQuery.data.website || "",
        logoUrl: getJobQuery.data.logoUrl || "",
        categories: getJobQuery.data.categories || [],
        locations: getJobQuery.data.locations || [],
      });
    }
  }, [getJobQuery.data]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleLocationToggle = (location: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter((l) => l !== location)
        : [...prev.locations, location],
    }));
  };

  const handleSave = async () => {
    try {
      await updateJobMutation.mutateAsync({ id: jobId, ...formData });
      toast.success("Vaga salva como rascunho");
    } catch {
      toast.error("Erro ao salvar vaga");
    }
  };

  const handleApproveClick = () => {
    if (!formData.title || !formData.company) {
      toast.error("Cargo e Empresa são obrigatórios");
      return;
    }
    if (!formData.categories.length) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }
    if (!formData.locations.length) {
      toast.error("Selecione pelo menos um local");
      return;
    }
    setShowPublishConfirm(true);
  };

  const handleApprove = async () => {
    try {
      await updateJobMutation.mutateAsync({ id: jobId, ...formData });
      const result = await approveMutation.mutateAsync({ id: jobId });
      toast.success(
        result.wpLink
          ? `Vaga publicada! ID WordPress: ${result.wpPostId}`
          : "Vaga aprovada com sucesso!"
      );
      setTimeout(() => setLocation("/approvals"), 1500);
    } catch (err: any) {
      const msg = err?.message || "Erro ao publicar vaga";
      if (msg.includes("credentials")) {
        toast.error("Configure as credenciais do WordPress primeiro em Configurações");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleReject = async () => {
    if (!confirm("Tem certeza que deseja rejeitar esta vaga?")) return;
    try {
      await rejectMutation.mutateAsync({ id: jobId });
      toast.success("Vaga rejeitada");
      setLocation("/approvals");
    } catch {
      toast.error("Erro ao rejeitar vaga");
    }
  };

  if (getJobQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!getJobQuery.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Vaga não encontrada</p>
        <Button onClick={() => setLocation("/approvals")}>Voltar</Button>
      </div>
    );
  }

  const job = getJobQuery.data;
  const isPublished = job.status === "published";

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/approvals")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Revisar Vaga</h1>
            <p className="text-slate-500 text-sm">
              Fonte: {job.source} •{" "}
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Ver original <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>
          {isPublished && (
            <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              ✓ Publicada no WordPress
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Informações Básicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Cargo / Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="mt-1.5"
                  placeholder="Ex: Psicólogo Clínico"
                />
              </div>
              <div>
                <Label htmlFor="company">Nome da Empresa *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="mt-1.5"
                  placeholder="Ex: Clínica Bem Estar"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="description">Descrição da Vaga</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={6}
                className="mt-1.5"
                placeholder="Descreva as responsabilidades, requisitos e benefícios da vaga..."
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="logoUrl">URL do Logo da Empresa</Label>
              <Input
                id="logoUrl"
                type="url"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange("logoUrl", e.target.value)}
                className="mt-1.5"
                placeholder="https://exemplo.com/logo.png"
              />
              {formData.logoUrl && (
                <img
                  src={formData.logoUrl}
                  alt="Logo"
                  className="mt-2 h-14 w-14 object-contain rounded border border-slate-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
          </Card>

          {/* Contact Info */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Contato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1.5"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1.5"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="website">Site da Empresa</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="mt-1.5"
                  placeholder="https://www.empresa.com.br"
                />
              </div>
            </div>
          </Card>

          {/* Location Info */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Localização
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="mt-1.5"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado (UF)</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
                  className="mt-1.5"
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="mt-1.5"
                  placeholder="01310-100"
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="mt-1.5"
                  placeholder="Rua das Flores, 123 - Bairro"
                />
              </div>
            </div>
          </Card>

          {/* Categories */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Categorias *{" "}
              <span className="text-xs text-slate-400 normal-case font-normal">
                ({formData.categories.length} selecionadas)
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {JOB_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={formData.categories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Locations */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Cidades *{" "}
              <span className="text-xs text-slate-400 normal-case font-normal">
                ({formData.locations.length} selecionadas)
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
              {JOB_LOCATIONS.map((location) => (
                <label
                  key={location}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={formData.locations.includes(location)}
                    onCheckedChange={() => handleLocationToggle(location)}
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    {location}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pb-8">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateJobMutation.isPending}
            >
              {updateJobMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Rascunho
            </Button>

            {!isPublished && (
              <>
                <Button
                  onClick={handleApproveClick}
                  disabled={approveMutation.isPending || updateJobMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publicando no WordPress...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Aprovar e Publicar
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Rejeitar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar vaga no WordPress?</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga <strong>"{formData.title}"</strong> de{" "}
              <strong>{formData.company}</strong> será publicada diretamente no
              site da Rede TEA. Esta ação não pode ser desfeita por aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Confirmar Publicação"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
