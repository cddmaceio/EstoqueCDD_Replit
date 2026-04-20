import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PackageSearch, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/admin/dashboard");
      }
    }
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-sm">
            <PackageSearch className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CDD Maceió</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestão de Estoque</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Acesso Administrativo</CardTitle>
            <CardDescription>Entre com suas credenciais para gerenciar o estoque.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@cddmaceio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {loginMutation.isError && (
                  <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">
                    Credenciais inválidas. Tente novamente.
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/estoque" className="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
            Acessar consulta pública de estoque
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
