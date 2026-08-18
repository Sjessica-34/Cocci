import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ArrowLeft, Mail } from "lucide-react";

const CONTACT_EMAIL = "bonjour@a-nim-pact.fr";

export function Demo() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Demande de démo — ${form.company || form.firstName + " " + form.lastName}`,
    );
    const body = encodeURIComponent(
      `Prénom : ${form.firstName}\nNom : ${form.lastName}\nEmail : ${form.email}\nEntreprise : ${form.company}\n\nMessage :\n${form.message}`,
    );

    // Ouvre le client e-mail de l'utilisateur avec les champs pré-remplis
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    setSubmitted(true);
  }

  const canSubmit =
    form.firstName.trim() &&
    form.email.trim() &&
    form.email.includes("@");

  if (submitted) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
        <div className="flex items-center justify-center mb-10">
          <img
            src={`${import.meta.env.BASE_URL}logo-dark.png`}
            alt="Cocci"
            className="h-9 w-auto"
          />
        </div>
        <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Merci !</h1>
            <p className="text-sm text-muted-foreground">
              Votre demande a bien été préparée. Si votre client e-mail ne s'est
              pas ouvert automatiquement, écrivez-nous directement à{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <img
          src={`${import.meta.env.BASE_URL}logo-dark.png`}
          alt="Cocci"
          className="h-9 w-auto"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Demander une démo</h1>
          <p className="text-muted-foreground text-sm">
            Notre équipe vous recontactera sous 24 h.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Marie"
                value={form.firstName}
                onChange={handleChange}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Dupont"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email professionnel *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="marie.dupont@entreprise.fr"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Entreprise */}
          <div className="space-y-1.5">
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              name="company"
              placeholder="Mon Entreprise"
              value={form.company}
              onChange={handleChange}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="message">Message (facultatif)</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Dites-nous en plus sur votre besoin…"
              rows={3}
              value={form.message}
              onChange={handleChange}
              className="resize-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            Envoyer ma demande
          </Button>
        </form>

        <Link href="/">
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            ← Retour à l'accueil
          </button>
        </Link>
      </div>
    </div>
  );
}
