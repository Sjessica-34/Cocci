import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 pb-8 flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              La page que vous recherchez n'existe pas ou a été déplacée.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-2">Retour au tableau de bord</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
