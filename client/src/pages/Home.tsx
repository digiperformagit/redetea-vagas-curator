import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Search, ArrowRight, Sparkles, Globe, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { JOB_CATEGORIES, JOB_LOCATIONS } from "@shared/constants";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  const searchMutation = trpc.jobs.search.useMutation();

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleLocationToggle = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    );
  };

  const handleSearch = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }
    if (selectedLocations.length === 0) {
      toast.error("Selecione pelo menos uma cidade");
      return;
    }

    try {
      const result = await searchMutation.mutateAsync({
        categories: selectedCategories,
        locations: selectedLocations,
      });
      toast.success(`${result.saved} vagas encontradas e salvas para revisão!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao buscar vagas");
    }
  };

  const selectAllCategories = () => {
    setSelectedCategories(
      selectedCategories.length === JOB_CATEGORIES.length ? [] : [...JOB_CATEGORIES]
    );
  };

  const selectAllLocations = () => {
    setSelectedLocations(
      selectedLocations.length === JOB_LOCATIONS.length ? [] : [...JOB_LOCATIONS]
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Buscar Vagas
          </h1>
          <p className="text-slate-500 text-sm">
            Selecione categorias e cidades para buscar vagas em fontes externas
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Globe, label: "Busca Automática", desc: "Indeed, Catho e IA", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Sparkles, label: "Revisão Inteligente", desc: "Edite antes de publicar", color: "text-purple-600", bg: "bg-purple-50" },
            { icon: CheckCircle2, label: "Publicação Direta", desc: "WordPress via API REST", color: "text-green-600", bg: "bg-green-50" },
          ].map((item) => (
            <Card key={item.label} className={`p-4 border-0 ${item.bg}`}>
              <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </Card>
          ))}
        </div>

        {/* Search Panel */}
        <Card className="p-6 mb-6">
          {/* Categories */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Categorias{" "}
                <span className="text-slate-400 normal-case font-normal">
                  ({selectedCategories.length}/{JOB_CATEGORIES.length})
                </span>
              </h2>
              <button
                onClick={selectAllCategories}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedCategories.length === JOB_CATEGORIES.length
                  ? "Limpar todas"
                  : "Selecionar todas"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {JOB_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                    selectedCategories.includes(category)
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Cidades{" "}
                <span className="text-slate-400 normal-case font-normal">
                  ({selectedLocations.length}/{JOB_LOCATIONS.length})
                </span>
              </h2>
              <button
                onClick={selectAllLocations}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedLocations.length === JOB_LOCATIONS.length
                  ? "Limpar todas"
                  : "Selecionar todas"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {JOB_LOCATIONS.map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationToggle(location)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                    selectedLocations.includes(location)
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={
              searchMutation.isPending ||
              selectedCategories.length === 0 ||
              selectedLocations.length === 0
            }
            className="w-full h-11 text-base font-semibold"
            size="lg"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Buscando vagas em fontes externas...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Buscar Vagas
                {(selectedCategories.length > 0 || selectedLocations.length > 0) && (
                  <span className="ml-2 text-sm opacity-80">
                    ({selectedCategories.length} categorias · {selectedLocations.length} cidades)
                  </span>
                )}
              </>
            )}
          </Button>
        </Card>

        {/* Success Result */}
        {searchMutation.isSuccess && (
          <Card className="p-5 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">
                    {searchMutation.data?.saved} vagas encontradas!
                  </p>
                  <p className="text-sm text-green-700">
                    Acesse a aba de Aprovações para revisar e publicar
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setLocation("/approvals")}
                className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
              >
                Ver Vagas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Error Result */}
        {searchMutation.isError && (
          <Card className="p-5 bg-red-50 border-red-200">
            <p className="text-red-800 font-medium text-sm">
              ✗ Erro na busca: {searchMutation.error.message}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
