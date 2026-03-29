/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt */
/**
 * Certificate of Vehicle Presence PDF template.
 * Generated server-side via @react-pdf/renderer.
 * Mirrors CertificatePDF.tsx patterns from EdgeProof core.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { type PlateCertificateData } from "@/types/lpr";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const C = {
  black: "#0f0f0f",
  dark: "#1a1a1a",
  mid: "#4a4a4a",
  label: "#6b6b6b",
  border: "#d4d4d4",
  light: "#e5e5e5",
  bg: "#ffffff",
  stripe: "#f8f8f8",

  tier1Bg: "#ecfdf5",
  tier1Border: "#059669",
  tier1Text: "#065f46",

  tier2Bg: "#fffbeb",
  tier2Border: "#d97706",
  tier2Text: "#92400e",

  tier3Bg: "#f0f9ff",
  tier3Border: "#0284c7",
  tier3Text: "#075985",
} as const;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.dark,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.black,
  },
  headerLeft: { flexDirection: "column", maxWidth: "55%" },
  logoText: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    letterSpacing: -0.5,
  },
  logoSub: { fontSize: 10, color: C.mid, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  certLabel: { fontSize: 7, color: C.label, textTransform: "uppercase", letterSpacing: 1 },
  certNumber: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.black, marginTop: 2 },
  certDate: { fontSize: 7, color: C.label, marginTop: 2 },

  // Tier badge
  tierBadge: {
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  tierSub: { fontSize: 7.5, marginTop: 2 },

  // Section
  section: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
    gap: 6,
  },
  sectionNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumText: { fontSize: 7, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },

  // Data grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  field: { width: "48%", paddingVertical: 4, paddingHorizontal: 6, backgroundColor: C.stripe },
  fieldWide: { width: "100%", paddingVertical: 4, paddingHorizontal: 6, backgroundColor: C.stripe },
  fieldLabel: { fontSize: 7, color: C.label, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { fontSize: 9, color: C.dark, marginTop: 2 },
  fieldMono: { fontSize: 7.5, color: C.dark, fontFamily: "Helvetica", marginTop: 2 },

  // Plate prominent display
  plateBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: C.black,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 10,
  },
  plateText: { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.black, letterSpacing: 4 },
  plateConf: { fontSize: 7.5, color: C.label, marginTop: 4 },

  // Thumbnail
  thumbnail: { width: 120, height: 60, objectFit: "contain", marginBottom: 8 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: C.light,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: { fontSize: 7, color: C.label },
  footerRight: { fontSize: 7, color: C.label, textAlign: "right" },
});

// ---------------------------------------------------------------------------
// Helper: tier style
// ---------------------------------------------------------------------------
function tierStyles(tier: 1 | 2 | 3) {
  if (tier === 1) return { badge: { backgroundColor: C.tier1Bg, borderColor: C.tier1Border }, text: C.tier1Text, dot: C.tier1Border };
  if (tier === 2) return { badge: { backgroundColor: C.tier2Bg, borderColor: C.tier2Border }, text: C.tier2Text, dot: C.tier2Border };
  return { badge: { backgroundColor: C.tier3Bg, borderColor: C.tier3Border }, text: C.tier3Text, dot: C.tier3Border };
}

function formatDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDwell(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function pct(conf: number): string {
  return `${Math.round(conf * 100)}% confidence`;
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------
interface PlateProofPDFProps {
  data: PlateCertificateData;
}

export function PlateProofPDF({ data }: PlateProofPDFProps) {
  const { plate_read: pr, tier } = data;
  const ts = tierStyles(tier);

  const vehicleDesc = [pr.vehicle_color, pr.vehicle_make, pr.vehicle_model, pr.vehicle_type]
    .filter(Boolean)
    .join(" ") || "—";

  return (
    <Document
      title={`PlateProof Certificate ${data.cert_number}`}
      author="PlateProof"
      subject="Certificate of Vehicle Presence"
    >
      <Page size="LETTER" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logoText}>PlateProof</Text>
            <Text style={s.logoSub}>Certificate of Vehicle Presence</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.certLabel}>Certificate Number</Text>
            <Text style={s.certNumber}>{data.cert_number}</Text>
            <Text style={s.certDate}>Generated {formatDT(data.generated_at)}</Text>
          </View>
        </View>

        {/* ── Tier badge ── */}
        <View style={[s.tierBadge, ts.badge]}>
          <View style={[s.tierDot, { backgroundColor: ts.dot }]} />
          <View>
            <Text style={[s.tierText, { color: ts.text }]}>{data.tier_label}</Text>
            <Text style={[s.tierSub, { color: ts.text }]}>
              {tier === 1
                ? "Plate read linked to hardware-signed video with verified certificate chain"
                : tier === 2
                  ? "Plate read verified by AXIS License Plate Verifier — video signature not verified"
                  : "Plate read from third-party LPR system — no cryptographic verification"}
            </Text>
          </View>
        </View>

        {/* ── 1. Vehicle Identity ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionNum}><Text style={s.sectionNumText}>1</Text></View>
            <Text style={s.sectionTitle}>Vehicle Identity</Text>
          </View>

          {/* Prominent plate display */}
          <View style={s.plateBox}>
            <Text style={s.plateText}>{pr.plate_text}</Text>
            <Text style={s.plateConf}>{pct(pr.plate_confidence)}</Text>
          </View>

          {/* Plate thumbnail if available */}
          {pr.plate_thumbnail_url ? (
            <Image src={pr.plate_thumbnail_url} style={s.thumbnail} />
          ) : null}

          <View style={s.grid}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Vehicle Description</Text>
              <Text style={s.fieldValue}>{vehicleDesc}</Text>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Direction</Text>
              <Text style={s.fieldValue}>{pr.direction?.toUpperCase() ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Temporal Record ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionNum}><Text style={s.sectionNumText}>2</Text></View>
            <Text style={s.sectionTitle}>Temporal Record</Text>
          </View>
          <View style={s.grid}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>First Seen</Text>
              <Text style={s.fieldValue}>{formatDT(pr.first_seen)}</Text>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Last Seen</Text>
              <Text style={s.fieldValue}>{formatDT(pr.last_seen)}</Text>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Dwell Time</Text>
              <Text style={s.fieldValue}>{formatDwell(pr.dwell_seconds)}</Text>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Event Type</Text>
              <Text style={s.fieldValue}>{pr.event_type.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── 3. Camera & Site Provenance ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionNum}><Text style={s.sectionNumText}>3</Text></View>
            <Text style={s.sectionTitle}>Camera & Site Provenance</Text>
          </View>
          <View style={s.grid}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>Camera ID</Text>
              <Text style={s.fieldValue}>{pr.camera_id}</Text>
            </View>
            {pr.camera_serial ? (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Serial Number</Text>
                <Text style={s.fieldValue}>{pr.camera_serial}</Text>
              </View>
            ) : null}
            {data.camera_model ? (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Camera Model</Text>
                <Text style={s.fieldValue}>{data.camera_model}</Text>
              </View>
            ) : null}
            {data.camera_firmware ? (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Firmware</Text>
                <Text style={s.fieldValue}>{data.camera_firmware}</Text>
              </View>
            ) : null}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Site ID</Text>
              <Text style={s.fieldValue}>{pr.site_id}</Text>
            </View>
            {data.site_name ? (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Site Name</Text>
                <Text style={s.fieldValue}>{data.site_name}</Text>
              </View>
            ) : null}
            {data.site_address ? (
              <View style={s.fieldWide}>
                <Text style={s.fieldLabel}>Site Address</Text>
                <Text style={s.fieldValue}>{data.site_address}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 4. Cryptographic Chain (Tier 1 only) ── */}
        {tier === 1 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionNum}><Text style={s.sectionNumText}>4</Text></View>
              <Text style={s.sectionTitle}>Cryptographic Certificate Chain</Text>
            </View>
            <View style={s.grid}>
              {data.signing_cert_serial ? (
                <View style={s.fieldWide}>
                  <Text style={s.fieldLabel}>Signing Certificate Serial</Text>
                  <Text style={s.fieldMono}>{data.signing_cert_serial}</Text>
                </View>
              ) : null}
              {data.issuing_ca ? (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Issuing CA</Text>
                  <Text style={s.fieldValue}>{data.issuing_ca}</Text>
                </View>
              ) : null}
              {data.fips_level ? (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>FIPS Level</Text>
                  <Text style={s.fieldValue}>{data.fips_level}</Text>
                </View>
              ) : null}
              {data.attestation_status ? (
                <View style={s.fieldWide}>
                  <Text style={s.fieldLabel}>Attestation Status</Text>
                  <Text style={s.fieldValue}>{data.attestation_status}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── 5. Certificate Metadata ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionNum}>
              <Text style={s.sectionNumText}>{tier === 1 ? "5" : "4"}</Text>
            </View>
            <Text style={s.sectionTitle}>Certificate Metadata</Text>
          </View>
          <View style={s.grid}>
            <View style={s.fieldWide}>
              <Text style={s.fieldLabel}>Certificate ID</Text>
              <Text style={s.fieldMono}>{data.cert_number}</Text>
            </View>
            <View style={s.fieldWide}>
              <Text style={s.fieldLabel}>Plate Read ID</Text>
              <Text style={s.fieldMono}>{pr.id}</Text>
            </View>
            <View style={s.fieldWide}>
              <Text style={s.fieldLabel}>Public Verification URL</Text>
              <Text style={s.fieldMono}>
                https://plateproof.com/plate/{data.public_token}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            PlateProof — Certified Vehicle Presence Records{"\n"}
            This certificate is provided for informational purposes.{"\n"}
            Consult legal counsel regarding admissibility in your jurisdiction.
          </Text>
          <Text style={s.footerRight}>
            {data.cert_number}{"\n"}
            plateproof.com/plate/{data.public_token}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
