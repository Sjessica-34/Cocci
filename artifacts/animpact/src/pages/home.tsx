import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, BarChart3, ShieldCheck, ArrowRight, CheckCircle2, Building2 } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight text-foreground">A-NIM-PACT</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="font-medium">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 px-4">
          <div className="container mx-auto max-w-5xl text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              The enterprise RSE platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Pilot your RSE strategy with <span className="text-primary">rigor and confidence.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A-NIM-PACT is the authoritative business intelligence platform for French SMEs and mid-sized companies to manage, track, and report on their corporate social responsibility.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-base font-medium w-full sm:w-auto">
                  Start your transformation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium w-full sm:w-auto">
                  Sign in to portal
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
                <h3 className="text-xl font-bold mb-3">Enterprise Grade</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Built for CFOs and CSR directors. Dense, information-rich dashboards that treat sustainability data with the same rigor as financial metrics.
                </p>
              </div>
              <div className="bg-background p-8 rounded-lg border border-border shadow-sm">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Compliant & Secure</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Stay ahead of French and European regulations. Structured reporting that stands up to auditor scrutiny and stakeholder expectations.
                </p>
              </div>
              <div className="bg-background p-8 rounded-lg border border-border shadow-sm">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-Entity</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Manage multiple organizations, subsidiaries, or portfolios from a single pane of glass with granular role-based access control.
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
            <span className="font-semibold text-muted-foreground">A-NIM-PACT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} A-NIM-PACT SaaS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
