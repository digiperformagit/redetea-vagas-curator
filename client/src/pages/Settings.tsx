import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, AlertCircle, Wifi, WifiOff, Trash2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const [wpUrl, setWpUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  const getCredsQuery = trpc.wpCredentials.get.useQuery();
  const setCredsMutation = trpc.wpCredentials.set.useMutation();
  const testCredsMutation = trpc.wpCredentials.test.useMutation();
  const deleteCredsMutation = trpc.wpCredentials.delete.useMutation();

  useEffect(() => {
    if (getCredsQuery.data) {
      setWpUrl(getCredsQuery.data.wpUrl);
      setWpUsername(getCredsQuery.data.wpUsername);
    }
  }, [getCredsQuery.data]);

  const handleSave = async () => {
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }
    if (!wpUrl.startsWith("https://") && !wpUrl.startsWith("http://")) {
      toast.error("URL deve começar com http:// ou https://");
      return;
    }

    try {
      await setCredsMutation.mutateAsync({ wpUrl, wpUsername, wpAppPassword });
      toast.success("Credenciais salvas e conexão verificada!");
      setWpAppPassword("");
      setConnectionStatus("success");
      getCredsQuery.refetch();
    } catch (err: any) {
      const msg = err?.message || "Erro ao salvar credenciais";
      if (msg.includes("connect") || msg.includes("credentials")) {
        toast.error("Não foi possível conectar ao WordPress. Verifique as credenciais.");
        setConnectionStatus("error");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleTest = async () => {
    try {
      await testCredsMutation.mutateAsync();
      toast.success("Conexão estabelecida com sucesso!");
      setConnectionStatus("success");
      getCredsQuery.refetch();
    } catch {
      toast.error("Falha na conexão com WordPress");
      setConnectionStatus("error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja remover as credenciais do WordPress?")) return;
    try {
      await deleteCredsMutation.mutateAsync();
      toast.success("Credenciais removidas");
      setWpUrl("");
      setWpUsername("");
      setWpAppPassword("");
      setConnectionStatus("idle");
      getCredsQuery.refetch();
    } catch {
      toast.error("Erro ao remover credenciais");
    }
  };

  const hasCreds = !!getCredsQuery.data;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Configurações</h1>
          <p className="text-slate-500 text-sm">
            Configure a integração com o WordPress da Rede TEA
          </p>
        </div>

        {/* Connection Status Banner */}
        {hasCreds && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 border ${
            connectionStatus === "error"
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}>
            {connectionStatus === "error" ? (
              <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : (
              <Wifi className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                connectionStatus === "error" ? "text-red-800" : "text-green-800"
              }`}>
                {connectionStatus === "error"
                  ? "Erro de conexão"
                  : "WordPress conectado"}
              </p>
              {getCredsQuery.data?.lastTestedAt && (
                <p className={`text-xs mt-0.5 ${
                  connectionStatus === "error" ? "text-red-600" : "text-green-600"
                }`}>
                  Último teste:{" "}
                  {new Date(getCredsQuery.data.lastTestedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testCredsMutation.isPending}
              className="flex-shrink-0"
            >
              {testCredsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Testar"
              )}
            </Button>
          </div>
        )}

        {/* Credentials Form */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">
            Credenciais do WordPress
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="wpUrl">URL do WordPress *</Label>
              <Input
                id="wpUrl"
                type="url"
                placeholder="https://redetea.com.br"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                URL base do seu site WordPress (sem barra no final)
              </p>
            </div>

            <div>
              <Label htmlFor="wpUsername">Usuário do WordPress *</Label>
              <Input
                id="wpUsername"
                type="text"
                placeholder="admin"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="wpAppPassword">Application Password *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="wpAppPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder={hasCreds ? "••••••••••••••••••••" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {hasCreds && !wpAppPassword && (
                <p className="text-xs text-slate-500 mt-1">
                  Deixe em branco para manter a senha atual
                </p>
              )}
            </div>
          </div>

          <Separator className="my-5" />

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={setCredsMutation.isPending || !wpUrl || !wpUsername || (!wpAppPassword && !hasCreds)}
              className="flex-1"
            >
              {setCredsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando e verificando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvar Credenciais
                </>
              )}
            </Button>
            {hasCreds && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteCredsMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {deleteCredsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* How to get Application Password */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Como gerar uma Application Password no WordPress
              </h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Acesse o painel Admin do WordPress</li>
                <li>Vá para <strong>Usuários → Seu Perfil</strong></li>
                <li>Desça até a seção <strong>"Application Passwords"</strong></li>
                <li>Digite um nome (ex: <em>"Rede TEA Curator"</em>)</li>
                <li>Clique em <strong>"Adicionar Application Password"</strong></li>
                <li>Copie a senha gerada e cole no campo acima</li>
              </ol>
              <p className="text-xs text-blue-700 mt-3">
                ⚠️ A senha só é exibida uma vez. Guarde-a em local seguro.
              </p>
            </div>
          </div>
        </Card>

        {/* Security Tips */}
        <Card className="p-6 mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Boas Práticas de Segurança
          </h3>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Use sempre HTTPS na URL do WordPress
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Prefira Application Passwords a senhas de usuário
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Regenere a senha periodicamente
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Nunca compartilhe suas credenciais
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
