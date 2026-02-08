import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { type CertificateData } from "@/types/api";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
  },
  logo: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  verificationId: {
    fontSize: 8,
    color: "#666",
    textAlign: "right",
  },
  verdictSection: {
    marginVertical: 20,
    padding: 20,
    textAlign: "center",
    borderRadius: 8,
  },
  verdictAuthentic: {
    backgroundColor: "#ecfdf5",
  },
  verdictTampered: {
    backgroundColor: "#fef2f2",
  },
  verdictUnsigned: {
    backgroundColor: "#fffbeb",
  },
  verdictText: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  verdictSubtext: {
    fontSize: 10,
    marginTop: 5,
    color: "#666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "40%",
    color: "#666",
  },
  value: {
    width: "60%",
    fontFamily: "Helvetica-Bold",
  },
  monoValue: {
    width: "60%",
    fontFamily: "Courier",
    fontSize: 8,
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  qrText: {
    fontSize: 6,
    color: "#999",
  },
});

interface CertificatePDFProps {
  data: CertificateData;
  qrCodeDataUrl?: string;
}

export function CertificatePDF({ data, qrCodeDataUrl }: CertificatePDFProps) {
  const isAuthentic = data.status === "authentic";
  const isTampered = data.status === "tampered";

  const verdictText = isAuthentic
    ? "VERIFIED AUTHENTIC"
    : isTampered
      ? "TAMPERING DETECTED"
      : "UNSIGNED VIDEO";

  const verdictColor = isAuthentic ? "#059669" : isTampered ? "#dc2626" : "#d97706";

  const verdictStyle = isAuthentic
    ? styles.verdictAuthentic
    : isTampered
      ? styles.verdictTampered
      : styles.verdictUnsigned;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>EdgeProof</Text>
          </View>
          <View>
            <Text style={styles.title}>Certificate of Video Authenticity</Text>
          </View>
          <View>
            {qrCodeDataUrl ? (
              <Image src={qrCodeDataUrl} style={{ width: 60, height: 60 }} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>QR Code</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.verificationId}>
          Verification ID: {data.verificationId}
        </Text>

        {/* Verdict */}
        <View style={[styles.verdictSection, verdictStyle]}>
          <Text style={[styles.verdictText, { color: verdictColor }]}>
            {verdictText}
          </Text>
          <Text style={styles.verdictSubtext}>
            {isAuthentic
              ? "This video has not been tampered with since recording"
              : isTampered
                ? "This video has been modified after recording"
                : "This video does not contain cryptographic signatures"}
          </Text>
        </View>

        {/* File Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>File Name</Text>
            <Text style={styles.value}>{data.fileName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>SHA-256 Hash</Text>
            <Text style={styles.monoValue}>{data.fileHash}</Text>
          </View>
        </View>

        {/* Device Origin */}
        {data.device.serial && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Origin</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Serial Number</Text>
              <Text style={styles.value}>{data.device.serial}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Model</Text>
              <Text style={styles.value}>{data.device.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Firmware</Text>
              <Text style={styles.value}>{data.device.firmware || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Certificate Chain</Text>
              <Text style={styles.value}>
                {data.certificateChain.valid ? "Valid" : "Invalid"}
              </Text>
            </View>
          </View>
        )}

        {/* Integrity */}
        {data.integrity.totalGops !== null && data.integrity.totalGops > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Integrity Report</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Total GOPs Analyzed</Text>
              <Text style={styles.value}>{data.integrity.totalGops}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Verified GOPs</Text>
              <Text style={styles.value}>{data.integrity.verifiedGops}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tampered GOPs</Text>
              <Text style={styles.value}>{data.integrity.tamperedGops}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Frames</Text>
              <Text style={styles.value}>
                {data.integrity.totalFrames?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Verified Frames</Text>
              <Text style={styles.value}>
                {data.integrity.verifiedFrames?.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Temporal */}
        {data.temporal.recordingStart && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temporal Data</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Recording Start</Text>
              <Text style={styles.value}>{data.temporal.recordingStart}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Recording End</Text>
              <Text style={styles.value}>
                {data.temporal.recordingEnd || "N/A"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>
                {data.temporal.durationSeconds
                  ? `${data.temporal.durationSeconds} seconds`
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gaps Detected</Text>
              <Text style={styles.value}>{data.temporal.gapsDetected}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This certificate was generated by EdgeProof using cryptographic
            verification of Axis Communications signed video technology.
          </Text>
          <Text style={{ marginTop: 4 }}>
            Verification uses IEEE 802.1AR (IDevID) device identity certificates
            and SHA-256 hash verification of individual video frames and GOP
            structures.
          </Text>
          {data.publicToken && (
            <Text style={{ marginTop: 4 }}>
              Verify this certificate online: https://edgeproof.com/verify/
              {data.publicToken}
            </Text>
          )}
          <Text style={{ marginTop: 8 }}>
            Issued: {new Date(data.issuedAt).toISOString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
