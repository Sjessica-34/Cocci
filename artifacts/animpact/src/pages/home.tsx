import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, BarChart3, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight text-foreground">cocci</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="font-medium">Se connecter</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="font-medium">Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 px-4">
          <div className="container mx-auto max-w-5xl text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              La plateforme RSE professionnelle
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Pilotez votre stratégie RSE avec <span className="text-primary">rigueur et confiance.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              cocci est la plateforme dédiée aux TPE, PME et ETI françaises pour gérer, suivre et
              rendre compte de leur responsabilité sociétale des entreprises.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-base font-medium w-full sm:w-auto">
                  Commencer votre démarche <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium w-full sm:w-auto">
                  Accéder à mon espace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-lg border border-border shadow-sm">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Niveau professionnel</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Conçu pour les DAF et directeurs RSE. Des tableaux de bord denses et informatifs qui
                  traitent les données RSE avec la même rigueur que les données financières.
                </p>
              </div>
              <div className="bg-background p-8 rounded-lg border border-border shadow-sm">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Conforme & sécurisé</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Restez en conformité avec les réglementations françaises et européennes. Un reporting
                  structuré qui résiste à l'examen des auditeurs et aux attentes des parties prenantes.
                </p>
              </div>
              <div className="bg-background p-8 rounded-lg border border-border shadow-sm">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-entités</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gérez plusieurs organisations, filiales ou portefeuilles depuis une interface unique
                  avec un contrôle d'accès granulaire basé sur les rôles.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-background border-t border-border mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">cocci</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} cocci. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
