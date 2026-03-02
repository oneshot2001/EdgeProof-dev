import Link from "next/link";
import {
  Shield,
  Upload,
  FileCheck,
  Award,
  ArrowRight,
  CheckCircle,
  Camera,
  Lock,
  Clock,
  Fingerprint,
  Scale,
  FileText,
  Link2,
  Users,
  Zap,
  AlertTriangle,
  X,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/layout/Footer";
import { TIER_LIMITS } from "@/lib/constants";

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                         */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight">EdgeProof</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero Section                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="hero-glow landing-grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 md:pb-32 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <Badge
              variant="outline"
              className="mb-6 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400"
            >
              <Fingerprint className="mr-1.5 h-3.5 w-3.5" />
              Cryptographic Video Verification
            </Badge>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Is Your Video Evidence{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                Defensible?
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              AI deepfakes make video manipulation trivial. Courts are
              increasingly skeptical. EdgeProof cryptographically verifies
              signed video and produces court-ready Certificates of Authenticity
              -- in under 60 seconds.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-500"
              >
                <Link href="/signup">
                  Verify Your First Video Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 text-base"
              >
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              No credit card required. 3 free verifications per month.
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-4 border-t border-border/50 pt-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>IEEE 802.1AR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-emerald-500" />
              <span>TPM Hardware Attestation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4 text-emerald-500" />
              <span>Court-Accepted Format</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Problem / Solution Section                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            {/* Problem */}
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                The Problem
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Video evidence is under attack
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                AI-generated deepfakes can now produce convincing fake video in
                minutes. Defense attorneys routinely challenge video evidence.
                Judges are increasingly requiring proof of authenticity.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Deepfake tools are free and widely available",
                  "67% of attorneys have challenged video evidence in court",
                  "Without cryptographic proof, video is just pixels",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <p className="text-sm text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution */}
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                The Solution
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Mathematically provable authenticity
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Axis Communications cameras cryptographically sign every frame
                at the hardware level. EdgeProof verifies these signatures and
                produces a Certificate of Authenticity that proves -- with
                mathematical certainty -- your video is unaltered.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Every GOP hash verified against TPM-bound signatures",
                  "Certificate chain traced to hardware root of trust",
                  "Tamper-evident: any modification breaks the chain",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How It Works                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="how-it-works"
        className="relative border-b border-border/50 py-20 md:py-28"
      >
        <div className="landing-grid-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-border/50 px-3 py-1"
            >
              Simple Process
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              From upload to court-ready in under 60 seconds
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No specialized knowledge required. Upload your signed video and
              let EdgeProof handle the cryptographic heavy lifting.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Upload,
                step: "01",
                title: "Upload Your Video",
                description:
                  "Drag and drop your signed video file. We support H.264, H.265, and AV1 formats from Axis cameras. Files are encrypted in transit and at rest.",
              },
              {
                icon: FileCheck,
                step: "02",
                title: "Cryptographic Verification",
                description:
                  "Our engine verifies every frame hash, validates the GOP signature chain, checks TPM attestation, and traces the full certificate chain to the hardware root.",
              },
              {
                icon: Award,
                step: "03",
                title: "Court-Ready Certificate",
                description:
                  "Download a Certificate of Authenticity with a unique QR code for independent verification. Formatted for court submission with chain of custody metadata.",
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className={index < 2 ? "step-connector" : ""}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 font-mono text-lg font-bold text-emerald-400">
                        {item.step}
                      </div>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Four Attorney Questions                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-border/50 px-3 py-1"
            >
              <Scale className="mr-1.5 h-3.5 w-3.5" />
              Built for Legal Professionals
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Answers the four questions every attorney asks
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              When video evidence is challenged in court, EdgeProof provides the
              cryptographic proof to answer every objection.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: CheckCircle,
                question: '"How do we know this wasn\'t edited?"',
                answer:
                  "Every frame and GOP hash is verified against the camera's cryptographic signature. Any modification -- even a single byte -- breaks the chain and is immediately detected.",
              },
              {
                icon: Camera,
                question:
                  '"How do we know this came from that specific camera?"',
                answer:
                  "Device identity is proven via IEEE 802.1AR certificates bound to tamper-resistant hardware (TPM). The signing key never leaves the camera.",
              },
              {
                icon: Clock,
                question: '"How do we know the timestamp is accurate?"',
                answer:
                  "Temporal analysis verifies the recording timeline for gaps, jumps, or missing segments. Timestamps are embedded in the cryptographic signature chain.",
              },
              {
                icon: Lock,
                question: '"Who has had access to this file?"',
                answer:
                  "Enterprise plan includes full chain of custody tracking. Every upload, verification, view, and download is logged with timestamps and user identity.",
              },
            ].map((item) => (
              <Card
                key={item.question}
                className="border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold italic">{item.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features Grid                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="features"
        className="relative border-b border-border/50 py-20 md:py-28"
      >
        <div className="landing-grid-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-border/50 px-3 py-1"
            >
              Platform Capabilities
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to defend video evidence
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Enterprise-grade verification infrastructure built for legal,
              security, and compliance teams.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Fingerprint,
                title: "Cryptographic Verification",
                description:
                  "Verify frame hashes, GOP signatures, and certificate chains using the same cryptographic primitives embedded by Axis cameras.",
              },
              {
                icon: Camera,
                title: "Axis Camera Support",
                description:
                  "Purpose-built for Axis Communications signed video. Supports H.264, H.265, and AV1 codecs across all Axis camera models with signing capability.",
              },
              {
                icon: FileText,
                title: "Court-Ready PDF Certificates",
                description:
                  "Generate professional Certificates of Authenticity with SHA-256 self-verification, QR codes, and metadata formatted for court submission.",
              },
              {
                icon: Link2,
                title: "Chain of Custody",
                description:
                  "Full audit trail from upload to download. Every interaction is logged with timestamps, user identity, and IP addresses for evidentiary completeness.",
              },
              {
                icon: Zap,
                title: "Under 60 Second Results",
                description:
                  "GPU-accelerated verification engine processes video files in seconds, not hours. Get your certificate before you finish your coffee.",
              },
              {
                icon: Users,
                title: "Team Management",
                description:
                  "Enterprise accounts support up to 25 team members with role-based access control. White-label certificates with your firm's branding.",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <feature.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Social Proof                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Trusted by legal and security professionals
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Organizations defending the integrity of video evidence rely on
              EdgeProof.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "EdgeProof eliminated every objection to our video evidence. The Certificate of Authenticity was accepted without challenge.",
                author: "Senior Partner",
                org: "National Law Firm",
                icon: Scale,
              },
              {
                quote:
                  "We verify every signed video before it enters our evidence management system. EdgeProof gives us the cryptographic proof we need.",
                author: "Director of Security",
                org: "Fortune 500 Company",
                icon: Building2,
              },
              {
                quote:
                  "The chain of custody feature alone justified the upgrade. Every interaction with the evidence is logged and traceable.",
                author: "Digital Forensics Lead",
                org: "Law Enforcement Agency",
                icon: Shield,
              },
            ].map((testimonial) => (
              <Card
                key={testimonial.author}
                className="border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="pt-6">
                  <testimonial.icon className="mb-4 h-6 w-6 text-emerald-400/60" />
                  <p className="text-sm italic leading-relaxed text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-semibold">
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.org}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="pricing"
        className="relative border-b border-border/50 py-20 md:py-28"
      >
        <div className="landing-grid-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-border/50 px-3 py-1"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when your caseload demands it. No hidden fees.
              No per-verification surprises.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Free Tier */}
            <Card className="relative border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">
                  {TIER_LIMITS.free.label}
                </CardTitle>
                <CardDescription>
                  Try it out. No credit card required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3">
                  {[
                    `${TIER_LIMITS.free.verificationsPerMonth} verifications/month`,
                    `${TIER_LIMITS.free.maxFileSizeLabel} max file size`,
                    "Basic certificate",
                    "Email support",
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Tier */}
            <Card className="pricing-highlight relative border-emerald-500/40 bg-card/50 backdrop-blur-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">
                  {TIER_LIMITS.professional.label}
                </CardTitle>
                <CardDescription>
                  For legal professionals and security teams.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${TIER_LIMITS.professional.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3">
                  {[
                    `${TIER_LIMITS.professional.verificationsPerMonth} verifications/month`,
                    `${TIER_LIMITS.professional.maxFileSizeLabel} max file size`,
                    "Branded certificate",
                    "Priority processing",
                    `Batch upload (up to ${TIER_LIMITS.professional.batchUploadLimit})`,
                    "1-year audit log retention",
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                  asChild
                >
                  <Link href="/signup">
                    Start Pro Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Enterprise Tier */}
            <Card className="relative border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">
                  {TIER_LIMITS.enterprise.label}
                </CardTitle>
                <CardDescription>
                  For law firms, agencies, and organizations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${TIER_LIMITS.enterprise.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "Unlimited verifications",
                    `${TIER_LIMITS.enterprise.maxFileSizeLabel} max file size`,
                    "White-label certificate",
                    "REST API access",
                    `Team management (up to ${TIER_LIMITS.enterprise.teamMembers})`,
                    "Chain of custody tracking",
                    "SSO / SAML support",
                    "Unlimited audit retention",
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signup">Contact Sales</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative py-20 md:py-28">
        <div className="hero-glow absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Ready to prove your video is real?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Upload your first video and get a Certificate of Authenticity in
            under 60 seconds. Free. No credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-500"
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 px-8 text-base"
            >
              <Link href="#pricing">
                View Pricing
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Built on Axis Communications signed video framework. IEEE 802.1AR
            compliant. SOC 2 Type II in progress.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="dark">
        <Footer />
      </div>
    </div>
  );
}
