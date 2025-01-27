import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, FileDown, Moon, Sun, Upload, Database, History, TestTube } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import { BlobProvider } from "@react-pdf/renderer";
import ServiceOrderPDF from "../ServiceOrderPDF";
import { ServiceOrder } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ServiceOrderHistory } from "./ServiceOrderHistory";

interface SettingsPanelProps {
  showSettings: boolean;
  serviceOrders: ServiceOrder[];
}

export const SettingsPanel = ({ showSettings, serviceOrders }: SettingsPanelProps) => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = React.useState(false);

  const handleExportDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*');

      if (error) throw error;

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-ordens-servico-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup realizado com sucesso!",
        description: "Os dados foram exportados em formato JSON.",
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: "Erro ao exportar dados",
        description: "Não foi possível realizar o backup dos dados.",
        variant: "destructive",
      });
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);

      if (!Array.isArray(importedData)) throw new Error('Formato de arquivo inválido');

      const { error: deleteError } = await supabase
        .from('service_orders')
        .delete()
        .neq('id', 0);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('service_orders')
        .insert(importedData.map(({ id, ...rest }) => rest));

      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });

      toast({
        title: "Dados importados com sucesso!",
        description: "O banco de dados foi atualizado com os dados do backup.",
      });
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      toast({
        title: "Erro ao importar dados",
        description: "Verifique se o arquivo está no formato correto.",
        variant: "destructive",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImplementTests = () => {
    toast({
      title: "Testes Automatizados",
      description: "Iniciando implementação dos testes automatizados...",
    });
    // Aqui você pode adicionar a lógica para implementar os testes
  };

  if (!showSettings) return null;

  return (
    <Card className="hover:shadow-lg transition-shadow border-muted bg-card/50 backdrop-blur-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings className="h-5 w-5 text-gray-400" />
          Ajustes do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Tema</span>
          <Toggle
            pressed={theme === "dark"}
            onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Toggle>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Exportar OS</span>
          <BlobProvider document={<ServiceOrderPDF serviceOrders={serviceOrders} />}>
            {({ url, loading }) => (
              <Button 
                variant="outline" 
                disabled={loading} 
                type="button"
                onClick={() => {
                  if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'ordens-servico.pdf';
                    link.click();
                  }
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {loading ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            )}
          </BlobProvider>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Backup do Banco</span>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleExportDatabase}
            >
              <Database className="mr-2 h-4 w-4" />
              Exportar Backup
            </Button>
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportDatabase}
                accept=".json"
                className="hidden"
              />
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar Backup
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Histórico de Alterações</span>
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Testes Automatizados</span>
          <Button
            variant="outline"
            onClick={handleImplementTests}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Implementar Testes
          </Button>
        </div>
        {showHistory && <ServiceOrderHistory />}
      </CardContent>
    </Card>
  );
};
