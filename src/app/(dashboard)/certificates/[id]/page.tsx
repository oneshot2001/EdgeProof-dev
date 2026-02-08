import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";
import { buildCertificateData } from "@/lib/pdf/certificate";

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { id } = await params;
  const verification = MOCK_VERIFICATIONS.find((v) => v.id === id);

  if (!verification) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Certificate Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The certificate you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/verifications">Back to Verifications</Link>
        </Button>
      </div>
    );
  }

  const certData = buildCertificateData(verification);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/verifications/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Certificate of Authenticity</h1>
        </div>
        <Button asChild>
          <a href={`/api/certificates/${id}/pdf`} download>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>

      <CertificatePreview data={certData} />
    </div>
  );
}
