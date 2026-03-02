/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image component does not support alt prop */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { type CertificateData } from "@/types/api";
import { formatDuration, formatFileSize } from "@/lib/pdf/certificate";

// ---------------------------------------------------------------------------
// Color system
// ---------------------------------------------------------------------------
const COLORS = {
  black: "#0f0f0f",
  darkGray: "#1a1a1a",
  mediumGray: "#4a4a4a",
  labelGray: "#6b6b6b",
  borderGray: "#d4d4d4",
  lightBorder: "#e5e5e5",
  pageBackground: "#ffffff",

  // Verdict backgrounds
  authenticBg: "#ecfdf5",
  authenticBorder: "#059669",
  authenticText: "#065f46",

  tamperedBg: "#fef2f2",
  tamperedBorder: "#dc2626",
  tamperedText: "#991b1b",

  unsignedBg: "#fffbeb",
  unsignedBorder: "#d97706",
  unsignedText: "#92400e",

  inconclusiveBg: "#f0f9ff",
  inconclusiveBorder: "#0284c7",
  inconclusiveText: "#075985",

  sectionHeaderBg: "#f8f8f8",
  sectionNumberBg: "#1a1a1a",
  sectionNumberText: "#ffffff",

  chainOfCustodyStripe: "#f5f5f5",
} as const;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.darkGray,
    backgroundColor: COLORS.pageBackground,
  },

  // -- Header --
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
  },
  headerLeft: {
    flexDirection: "column",
    maxWidth: "55%",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 7,
    color: COLORS.labelGray,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    marginTop: 8,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  qrCode: {
    width: 72,
    height: 72,
  },
  qrPlaceholder: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholderText: {
    fontSize: 6,
    color: COLORS.labelGray,
  },

  // -- Meta row under header --
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingTop: 6,
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 7,
    color: COLORS.labelGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.darkGray,
    marginTop: 1,
  },
  metaValueMono: {
    fontSize: 7,
    fontFamily: "Courier",
    color: COLORS.darkGray,
    marginTop: 1,
  },

  // -- Verdict --
  verdictContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    textAlign: "center",
  },
  verdictSymbol: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  verdictLabel: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 2,
  },
  verdictSubtext: {
    fontSize: 9,
    color: COLORS.mediumGray,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 1.4,
  },

  // -- Sections --
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  sectionNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.sectionNumberBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  sectionNumberText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.sectionNumberText,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },

  // -- Data rows --
  dataRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingVertical: 2,
  },
  dataLabel: {
    width: "38%",
    fontSize: 9,
    color: COLORS.labelGray,
  },
  dataValue: {
    width: "62%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.darkGray,
  },
  dataValueMono: {
    width: "62%",
    fontSize: 7.5,
    fontFamily: "Courier",
    color: COLORS.darkGray,
  },
  // dataValueGood and dataValueBad colors are applied via style array in DataRow

  // -- Chain of Custody --
  auditTable: {
    marginTop: 4,
  },
  auditHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.sectionHeaderBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  auditHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  auditRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lightBorder,
  },
  auditRowStriped: {
    backgroundColor: COLORS.chainOfCustodyStripe,
  },
  auditCell: {
    fontSize: 8,
    color: COLORS.darkGray,
  },
  auditCellMono: {
    fontSize: 7,
    fontFamily: "Courier",
    color: COLORS.darkGray,
  },
  colTimestamp: { width: "28%" },
  colAction: { width: "22%" },
  colUser: { width: "30%" },
  colIp: { width: "20%" },

  // -- Methodology / legal footer --
  methodologyContainer: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightBorder,
  },
  methodologyText: {
    fontSize: 7.5,
    color: COLORS.mediumGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  methodologyBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.mediumGray,
  },

  // -- Page footer --
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.borderGray,
  },
  footerLeft: {
    fontSize: 7,
    color: COLORS.labelGray,
  },
  footerRight: {
    fontSize: 7,
    color: COLORS.labelGray,
  },

  // -- Divider --
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lightBorder,
    marginVertical: 6,
  },

  // Integrity bar visual
  integrityBarContainer: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 4,
  },
  integrityBarVerified: {
    backgroundColor: COLORS.authenticBorder,
  },
  integrityBarTampered: {
    backgroundColor: COLORS.tamperedBorder,
  },
  integrityBarUnknown: {
    backgroundColor: COLORS.borderGray,
  },
  integrityBarLabel: {
    fontSize: 7,
    color: COLORS.labelGray,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VerdictConfig {
  symbol: string;
  label: string;
  subtext: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

function getVerdictConfig(status: CertificateData["status"]): VerdictConfig {
  switch (status) {
    case "authentic":
      return {
        symbol: "\u2713",
        label: "VERIFIED AUTHENTIC",
        subtext:
          "Cryptographic analysis confirms this video has not been altered since it was recorded by the originating device. All frame hashes and GOP signatures are intact.",
        bgColor: COLORS.authenticBg,
        borderColor: COLORS.authenticBorder,
        textColor: COLORS.authenticText,
      };
    case "tampered":
      return {
        symbol: "\u2717",
        label: "TAMPERING DETECTED",
        subtext:
          "Cryptographic analysis has identified modifications to this video after it was originally recorded. One or more frame hashes or GOP signatures do not match expected values.",
        bgColor: COLORS.tamperedBg,
        borderColor: COLORS.tamperedBorder,
        textColor: COLORS.tamperedText,
      };
    case "unsigned":
      return {
        symbol: "\u2014",
        label: "UNSIGNED VIDEO",
        subtext:
          "This video file does not contain Axis Communications cryptographic signatures. Authenticity cannot be verified through signed video technology.",
        bgColor: COLORS.unsignedBg,
        borderColor: COLORS.unsignedBorder,
        textColor: COLORS.unsignedText,
      };
    case "inconclusive":
      return {
        symbol: "?",
        label: "INCONCLUSIVE",
        subtext:
          "The verification process could not reach a definitive conclusion about the authenticity of this video. Manual review may be required.",
        bgColor: COLORS.inconclusiveBg,
        borderColor: COLORS.inconclusiveBorder,
        textColor: COLORS.inconclusiveText,
      };
    default:
      return {
        symbol: "!",
        label: "VERIFICATION ERROR",
        subtext:
          "An error occurred during the verification process. The integrity of this video could not be determined.",
        bgColor: COLORS.inconclusiveBg,
        borderColor: COLORS.inconclusiveBorder,
        textColor: COLORS.inconclusiveText,
      };
  }
}

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatDateOnly(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    uploaded: "File Uploaded",
    verified: "Verification Completed",
    viewed: "Certificate Viewed",
    downloaded_pdf: "PDF Downloaded",
    downloaded_video: "Video Downloaded",
    shared: "Certificate Shared",
    exported_audit: "Audit Log Exported",
  };
  return map[action] || action;
}

// ---------------------------------------------------------------------------
// Component: Section header with numbered circle
// ---------------------------------------------------------------------------
function SectionHeader({
  number,
  title,
}: {
  number: number;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component: Data row (label-value pair)
// ---------------------------------------------------------------------------
function DataRow({
  label,
  value,
  mono,
  good,
  bad,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  const displayValue =
    value === null || value === undefined ? "N/A" : String(value);

  // Use base style + conditional color override to avoid strict literal type conflicts
  const baseStyle = mono ? styles.dataValueMono : styles.dataValue;
  const colorOverride = good
    ? { color: COLORS.authenticBorder as string }
    : bad
      ? { color: COLORS.tamperedBorder as string }
      : {};

  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[baseStyle, colorOverride]}>{displayValue}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component: Integrity progress bar
// ---------------------------------------------------------------------------
function IntegrityBar({
  verified,
  tampered,
  total,
}: {
  verified: number;
  tampered: number;
  total: number;
}) {
  if (total === 0) return null;
  const verifiedPct = (verified / total) * 100;
  const tamperedPct = (tampered / total) * 100;
  const unknownPct = 100 - verifiedPct - tamperedPct;

  return (
    <View>
      <View style={styles.integrityBarContainer}>
        {verifiedPct > 0 && (
          <View
            style={[
              styles.integrityBarVerified,
              { width: `${verifiedPct}%` } as never,
            ]}
          />
        )}
        {tamperedPct > 0 && (
          <View
            style={[
              styles.integrityBarTampered,
              { width: `${tamperedPct}%` } as never,
            ]}
          />
        )}
        {unknownPct > 0 && (
          <View
            style={[
              styles.integrityBarUnknown,
              { width: `${unknownPct}%` } as never,
            ]}
          />
        )}
      </View>
      <Text style={styles.integrityBarLabel}>
        {verifiedPct.toFixed(1)}% verified
        {tamperedPct > 0 ? ` | ${tamperedPct.toFixed(1)}% tampered` : ""}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CertificatePDFProps {
  data: CertificateData;
  qrCodeDataUrl?: string;
}

export function CertificatePDF({ data, qrCodeDataUrl }: CertificatePDFProps) {
  const verdict = getVerdictConfig(data.status);
  const hasDevice = Boolean(data.device.serial || data.device.model);
  const hasIntegrity =
    data.integrity.totalGops !== null && data.integrity.totalGops > 0;
  const hasTemporal = Boolean(data.temporal.recordingStart);
  const hasAuditLog = data.auditLog.length > 0;
  const hasAttestation = data.attestation.valid !== null;

  // Section numbering is dynamic based on what data is present
  let sectionNum = 0;
  const nextSection = () => ++sectionNum;

  return (
    <Document
      title={`EdgeProof Certificate - ${data.verificationId}`}
      author="EdgeProof"
      subject="Certificate of Video Authenticity"
      creator="EdgeProof Verification Platform"
    >
      <Page size="A4" style={styles.page}>
        {/* ================================================================
            HEADER
            ================================================================ */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>EDGEPROOF</Text>
            <Text style={styles.logoSubtext}>
              VIDEO AUTHENTICITY VERIFICATION
            </Text>
            <Text style={styles.titleText}>
              Certificate of Video Authenticity
            </Text>
          </View>
          <View style={styles.headerRight}>
            {qrCodeDataUrl ? (
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>QR</Text>
              </View>
            )}
          </View>
        </View>

        {/* Meta row: Verification ID, Date, File Hash */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Verification ID</Text>
            <Text style={styles.metaValueMono}>{data.verificationId}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>
              {formatDateOnly(data.issuedAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Verified</Text>
            <Text style={styles.metaValue}>
              {data.verifiedAt ? formatTimestamp(data.verifiedAt) : "Pending"}
            </Text>
          </View>
        </View>

        {/* ================================================================
            SECTION 1: VERDICT
            ================================================================ */}
        <View
          style={[
            styles.verdictContainer,
            {
              backgroundColor: verdict.bgColor,
              borderColor: verdict.borderColor,
            },
          ]}
        >
          <Text style={[styles.verdictSymbol, { color: verdict.textColor }]}>
            {verdict.symbol}
          </Text>
          <Text style={[styles.verdictLabel, { color: verdict.textColor }]}>
            {verdict.label}
          </Text>
          <Text style={styles.verdictSubtext}>{verdict.subtext}</Text>
        </View>

        {/* ================================================================
            SECTION 2: FILE INFORMATION
            ================================================================ */}
        <View style={styles.section}>
          <SectionHeader number={nextSection()} title="File Information" />
          <DataRow label="File Name" value={data.fileName} />
          <DataRow
            label="File Size"
            value={
              data.fileSizeBytes ? formatFileSize(data.fileSizeBytes) : null
            }
          />
          <DataRow label="SHA-256 Hash" value={data.fileHash} mono />
        </View>

        {/* ================================================================
            SECTION 3: DEVICE ORIGIN
            ================================================================ */}
        {hasDevice && (
          <View style={styles.section}>
            <SectionHeader number={nextSection()} title="Device Origin" />
            <DataRow label="Serial Number" value={data.device.serial} mono />
            <DataRow label="Camera Model" value={data.device.model} />
            <DataRow label="Firmware Version" value={data.device.firmware} />
            {data.device.hardwareId && (
              <DataRow
                label="Hardware ID"
                value={data.device.hardwareId}
                mono
              />
            )}
            <DataRow
              label="Certificate Chain"
              value={
                data.certificateChain.valid === null
                  ? "N/A"
                  : data.certificateChain.valid
                    ? "Valid - Trusted"
                    : "Invalid - Untrusted"
              }
              good={data.certificateChain.valid === true}
              bad={data.certificateChain.valid === false}
            />
            {hasAttestation && (
              <DataRow
                label="Key Attestation"
                value={
                  data.attestation.valid
                    ? "Valid - TPM Bound"
                    : "Invalid or Absent"
                }
                good={data.attestation.valid === true}
                bad={data.attestation.valid === false}
              />
            )}
            {data.certificateChain.intermediate && (
              <DataRow
                label="Intermediate CA"
                value={data.certificateChain.intermediate}
                mono
              />
            )}
            {data.certificateChain.root && (
              <DataRow
                label="Root CA"
                value={data.certificateChain.root}
                mono
              />
            )}
          </View>
        )}

        {/* ================================================================
            SECTION 4: INTEGRITY ANALYSIS
            ================================================================ */}
        {hasIntegrity && (
          <View style={styles.section}>
            <SectionHeader number={nextSection()} title="Integrity Analysis" />
            <DataRow
              label="Total GOPs Analyzed"
              value={data.integrity.totalGops}
            />
            <DataRow
              label="Verified GOPs"
              value={data.integrity.verifiedGops}
              good={
                data.integrity.verifiedGops === data.integrity.totalGops
              }
            />
            <DataRow
              label="Tampered GOPs"
              value={data.integrity.tamperedGops}
              bad={(data.integrity.tamperedGops ?? 0) > 0}
            />
            <DataRow
              label="Total Frames"
              value={data.integrity.totalFrames?.toLocaleString()}
            />
            <DataRow
              label="Verified Frames"
              value={data.integrity.verifiedFrames?.toLocaleString()}
              good={
                data.integrity.verifiedFrames === data.integrity.totalFrames
              }
            />
            {(data.integrity.tamperedFrames ?? 0) > 0 && (
              <DataRow
                label="Tampered Frames"
                value={data.integrity.tamperedFrames?.toLocaleString()}
                bad
              />
            )}
            <DataRow
              label="GOP Chain Continuity"
              value={
                data.integrity.chainIntact === null
                  ? "N/A"
                  : data.integrity.chainIntact
                    ? "Intact - No breaks detected"
                    : "Broken - Discontinuity detected"
              }
              good={data.integrity.chainIntact === true}
              bad={data.integrity.chainIntact === false}
            />
            <DataRow
              label="Hash Algorithm"
              value={data.integrity.hashAlgorithm}
            />

            {/* Visual integrity bar */}
            {data.integrity.totalGops !== null &&
              data.integrity.verifiedGops !== null &&
              data.integrity.tamperedGops !== null && (
                <IntegrityBar
                  verified={data.integrity.verifiedGops}
                  tampered={data.integrity.tamperedGops}
                  total={data.integrity.totalGops}
                />
              )}
          </View>
        )}

        {/* ================================================================
            SECTION 5: TEMPORAL DATA
            ================================================================ */}
        {hasTemporal && (
          <View style={styles.section}>
            <SectionHeader number={nextSection()} title="Temporal Analysis" />
            <DataRow
              label="Recording Start"
              value={
                data.temporal.recordingStart
                  ? formatTimestamp(data.temporal.recordingStart)
                  : null
              }
            />
            <DataRow
              label="Recording End"
              value={
                data.temporal.recordingEnd
                  ? formatTimestamp(data.temporal.recordingEnd)
                  : null
              }
            />
            <DataRow
              label="Duration"
              value={
                data.temporal.durationSeconds
                  ? formatDuration(data.temporal.durationSeconds)
                  : null
              }
            />
            <DataRow
              label="Temporal Gaps"
              value={
                data.temporal.gapsDetected === 0
                  ? "None detected"
                  : `${data.temporal.gapsDetected} gap(s) detected`
              }
              good={data.temporal.gapsDetected === 0}
              bad={data.temporal.gapsDetected > 0}
            />
          </View>
        )}

        {/* ================================================================
            SECTION 6: CHAIN OF CUSTODY (Enterprise only)
            ================================================================ */}
        {hasAuditLog && (
          <View style={styles.section} break={data.auditLog.length > 6}>
            <SectionHeader number={nextSection()} title="Chain of Custody" />
            <View style={styles.auditTable}>
              {/* Table header */}
              <View style={styles.auditHeader}>
                <Text style={[styles.auditHeaderCell, styles.colTimestamp]}>
                  Timestamp
                </Text>
                <Text style={[styles.auditHeaderCell, styles.colAction]}>
                  Action
                </Text>
                <Text style={[styles.auditHeaderCell, styles.colUser]}>
                  User
                </Text>
                <Text style={[styles.auditHeaderCell, styles.colIp]}>
                  IP Address
                </Text>
              </View>
              {/* Table rows */}
              {data.auditLog.map((entry, idx) => (
                <View
                  key={`audit-${idx}`}
                  style={[
                    styles.auditRow,
                    idx % 2 === 1 ? styles.auditRowStriped : {},
                  ]}
                >
                  <Text style={[styles.auditCell, styles.colTimestamp]}>
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                  <Text style={[styles.auditCell, styles.colAction]}>
                    {formatAuditAction(entry.action)}
                  </Text>
                  <Text style={[styles.auditCell, styles.colUser]}>
                    {entry.userEmail || "System"}
                  </Text>
                  <Text style={[styles.auditCellMono, styles.colIp]}>
                    {entry.ipAddress || "\u2014"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================================================================
            SECTION 7: METHODOLOGY & LEGAL FOOTER
            ================================================================ */}
        <View style={styles.methodologyContainer}>
          <SectionHeader
            number={nextSection()}
            title="Verification Methodology"
          />

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>
              Cryptographic Verification:{" "}
            </Text>
            This certificate was generated by EdgeProof using automated
            cryptographic analysis of Axis Communications signed video
            technology. Each video frame is individually hashed (SHA-256) and
            grouped into GOPs (Groups of Pictures). Each GOP hash is digitally
            signed using a TPM-bound video signing key embedded in the
            originating camera hardware.
          </Text>

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>
              Public Key Infrastructure:{" "}
            </Text>
            Device identity is verified using IEEE 802.1AR (IDevID) certificates
            issued by Axis Communications. The certificate chain is validated
            against Axis Root Certificate Authorities (RSA and ECC, valid until
            2060) through six intermediate CAs. Key attestation confirms the
            signing key is bound to the camera&apos;s Trusted Platform Module
            (TPM).
          </Text>

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>GOP Chain Linking: </Text>
            Adjacent GOPs are cryptographically linked by including the first
            I-frame hash of the next GOP in the current GOP&apos;s signature.
            This prevents undetectable removal or insertion of video segments.
          </Text>

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>Signed Video Format: </Text>
            Signatures are embedded as SEI NALU &quot;user data
            unregistered&quot; payloads (H.264/H.265) or OBU Metadata (AV1),
            identified by UUID 5369676e-6564-2056-6964-656f2e2e2e30. The
            verification framework is based on the open-source
            signed-video-framework by Axis Communications.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>Legal Notice: </Text>
            This certificate is generated by automated cryptographic analysis
            and is intended to support, not replace, expert testimony regarding
            video evidence authenticity. EdgeProof provides this analysis as a
            technical tool. The admissibility and weight of this evidence is
            subject to the rules of the applicable jurisdiction and the
            discretion of the presiding court.
          </Text>

          {/* Self-hash and verification link */}
          <View style={styles.divider} />

          <Text style={styles.methodologyText}>
            <Text style={styles.methodologyBold}>Verification ID: </Text>
            {data.verificationId}
          </Text>

          {data.certificateHash && (
            <Text style={styles.methodologyText}>
              <Text style={styles.methodologyBold}>
                Certificate SHA-256 Self-Hash:{" "}
              </Text>
              {data.certificateHash}
            </Text>
          )}

          {data.publicToken && (
            <Text style={styles.methodologyText}>
              <Text style={styles.methodologyBold}>Online Verification: </Text>
              https://edgeproof.com/verify/{data.publicToken}
            </Text>
          )}
        </View>

        {/* ================================================================
            PAGE FOOTER
            ================================================================ */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerLeft}>
            EdgeProof Certificate of Video Authenticity
          </Text>
          <Text style={styles.footerRight}>
            Generated {formatTimestamp(data.issuedAt)} | Confidential
          </Text>
        </View>
      </Page>
    </Document>
  );
}
