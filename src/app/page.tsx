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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">EdgeProof</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <Badge variant="secondary" className="mb-4">
            Cryptographic Video Verification
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            Is Your Video Evidence{" "}
            <span className="text-primary">Defensible?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Deepfakes make video manipulation trivial. Courts are skeptical.
            EdgeProof cryptographically verifies signed video in seconds and
            generates court-ready Certificates of Authenticity.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Verify Your First Video Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. 3 free verifications.
          </p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
                The Problem
              </h2>
              <h3 className="mt-2 text-2xl font-bold">
                Video evidence is losing credibility
              </h3>
              <p className="mt-4 text-muted-foreground">
                AI-generated deepfakes can now produce convincing fake video in
                minutes. Defense attorneys routinely challenge video evidence.
                Without cryptographic proof, your video is just pixels on a
                screen.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                The Solution
              </h2>
              <h3 className="mt-2 text-2xl font-bold">
                Mathematically provable authenticity
              </h3>
              <p className="mt-4 text-muted-foreground">
                Axis Communications cameras cryptographically sign every frame at
                recording time. EdgeProof verifies these signatures and generates
                a Certificate of Authenticity that proves — with mathematical
                certainty — that your video is unaltered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-2 text-muted-foreground">
              Three steps. Under 60 seconds. Court-ready results.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Upload,
                step: "1",
                title: "Upload Your Video",
                description:
                  "Drag and drop your signed video file. We support MP4 and MKV formats from Axis cameras.",
              },
              {
                icon: FileCheck,
                step: "2",
                title: "Automatic Verification",
                description:
                  "Our engine verifies every cryptographic signature, validates the certificate chain, and checks for tampering.",
              },
              {
                icon: Award,
                step: "3",
                title: "Get Your Certificate",
                description:
                  "Download a court-ready Certificate of Authenticity with a QR code for independent verification.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Four Questions */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              Answers the Four Questions Every Attorney Asks
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: CheckCircle,
                question: "How do we know this wasn't edited?",
                answer:
                  "Every frame and GOP hash is verified against the camera's cryptographic signature. Any modification breaks the chain.",
              },
              {
                icon: Camera,
                question: "How do we know this came from that camera?",
                answer:
                  "Device identity is proven via IEEE 802.1AR certificates embedded in tamper-resistant hardware (TPM).",
              },
              {
                icon: Clock,
                question: "How do we know the timestamp is accurate?",
                answer:
                  "Temporal analysis detects gaps, jumps, or missing segments in the recording timeline.",
              },
              {
                icon: Lock,
                question: "Who had access to this file?",
                answer:
                  "Enterprise plan includes full chain of custody — every upload, view, and download is logged.",
              },
            ].map((item) => (
              <Card key={item.question}>
                <CardContent className="flex gap-4 pt-6">
                  <item.icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{item.question}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for trying it out",
                features: [
                  "3 verifications/month",
                  "2 GB max file",
                  "Basic certificate",
                ],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Professional",
                price: "$99",
                description: "For legal professionals",
                features: [
                  "100 verifications/month",
                  "10 GB max file",
                  "Branded certificate",
                  "Priority processing",
                  "Batch upload",
                ],
                cta: "Start Pro Trial",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "$499",
                description: "For law firms & organizations",
                features: [
                  "Unlimited verifications",
                  "50 GB max file",
                  "White-label certificate",
                  "API access",
                  "Team management",
                  "Chain of custody",
                  "SSO support",
                ],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlight ? "border-primary shadow-lg" : ""}
              >
                {plan.highlight && (
                  <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">
            Ready to prove your video is real?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Upload your first video and get a Certificate of Authenticity in
            under 60 seconds. Free. No credit card required.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
