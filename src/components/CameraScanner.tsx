// File: src/components/CameraScanner.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Video,
  RefreshCw,
  Upload,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Sparkles,
  Loader2,
  X,
  Scan,
  Maximize2,
  Play,
  Pause,
  Layers,
  Activity,
  User,
  PawPrint,
  Package,
  Bug,
  AlertTriangle,
  Compass,
  Bot,
  Shirt,
  Scissors
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { enhanceCameraImage, type EnhancementResult } from '../lib/imageEnhancer';
import { supabase, type MosquitoReport } from '../lib/supabase';
import { type UserProfile } from '../lib/authStorage';
import {
  serializeReportStatus,
  compressImageToDataUrl,
  type ReportMetadata
} from '../lib/reportData';
import { enqueueOfflineReport } from '../lib/offlineSync';
import { playHazardAlert, playSuccessChime, playTapSound, triggerHaptic } from '../lib/soundFx';
import {
  MosquitoLoadingScanner,
  BatikKawungPattern,
  BatikCorner
} from './BatikDecorations';

export type EntityCategory = 'jentik_sarang' | 'vektor_istirahat' | 'manusia' | 'hewan' | 'benda_mati';

export interface ScanFactorBreakdown {
  containerScore: number;
  containerReason: string;
  waterStagnancyScore: number;
  waterStagnancyReason: string;
  motilityScore?: number;
  motilityReason?: string;
  environmentScore: number;
  environmentReason: string;
  debrisScore: number;
  debrisReason: string;
}

export interface ScanAnalysisResult {
  entityCategory: EntityCategory;
  isBreedingSite: boolean;
  riskPercentage: number;
  riskLevel: 'Aman' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Bahaya';
  detectedObject: string;
  waterDetected: boolean;
  motilityDetected?: boolean;
  lifeCycleStage?: 'dewasa_istirahat' | 'jentik_akuatik' | 'telur_dorman' | 'bukan_vektor';
  cycleBreakerTitle?: string;
  cycleBreakerDetail?: string;
  factors: ScanFactorBreakdown;
  scientificExplanation: string;
  actionSteps: string[];
  scanMode: 'photo' | 'video';
  capturedFrames?: string[];
}

interface CameraScannerProps {
  currentUser?: UserProfile | null;
  onPinToRadar: (newReport: MosquitoReport) => void;
  onNavigateToRadar: () => void;
  onConsultAI?: (data: { photoUrl?: string; summary: string; explanation?: string }) => void;
}

const PHOTO_VISION_PROMPT = `Kamu adalah AI Pakar Entomologi, Vektor Penyakit Tropis, dan Computer Vision di Zero-G Mosquito.
Tugasmu: Menganalisa foto yang dipindai kamera warga, MEMBEDAKAN SECARA AKURAT jenis entitasnya, dan MEMBERIKAN LOGIKA PEMUTUS SIKLUS HIDUP NYAMUK:

ATURAN PALING KRUSIAL (ANTI-HALUSINASI & SENSOR TERTUTUP):
- JIKA gambar gelap gulita, hitam, buram tanpa detail, kamera ditutup jari/tangan/meja, atau tidak tampak objek nyata:
  * entityCategory: "benda_mati"
  * detectedObject: "Kamera Tertutup / Layar Gelap (Tidak Ada Objek)"
  * isBreedingSite: false
  * riskPercentage: 0
  * riskLevel: "Aman"
  * waterDetected: false
  * lifeCycleStage: "bukan_vektor"
  * cycleBreakerTitle: "Lensa Tertutup (Bukan Objek Nyata)"
  * cycleBreakerDetail: "Pastikan kamera terbuka dan arahkan ke objek nyata."
  * factors: Semua skor 0 (containerScore: 0, waterStagnancyScore: 0, environmentScore: 0, debrisScore: 0)
  * scientificExplanation: "Lensa kamera tertutup atau pencahayaan terlalu gelap. Tidak ada wadah air, genangan, ataupun sarang nyamuk yang terlihat."
  * actionSteps: ["Buka penutup kamera atau bersihkan lensa.", "Arahkan kamera ke gantungan baju untuk memeriksa resting site, atau ke wadah air untuk memeriksa jentik."]
  * JANGAN PERNAH MENGASUMSIKAN ATAU MENGARANG ADA WADAH AIR JIKA OBJEK FISIK TIDAK TAMPAK JELAS!

TAHAP 1: KLASIFIKASI ENTITAS & SIKLUS HIDUP (entityCategory):
Pilihlah salah satu dari 5 kategori berikut:
1. "manusia" : Jika objek utama adalah manusia (wajah, tangan, kaki, orang dewasa, anak-anak, tubuh).
2. "hewan" : Jika objek utama adalah hewan/binatang (kucing, anjing, burung, ikan hias di akuarium bersih, reptil, serangga selain nyamuk).
3. "vektor_istirahat" : JIKA OBJEK ADALAH GANTUNGAN BAJU, PAKAIAN KOTOR/BEKAS PAKAI DI BALIK PINTU/DINDING, TUMPUKAN KAIN, GORDEN GELAP, ATAU SUDUT LEMBAP BERKAIN.
   * FAKTA ENTOMOLOGI MEDIS KRUSIAL: Ini adalah RESTING SITE (tempat peristirahatan) utama nyamuk Aedes aegypti dewasa (fase Imago). Nyamuk betina tertarik oleh aroma keringat/asam laktat tubuh manusia yang menempel di serat pakaian dan berlindung di lipatan kain gelap untuk mencerna darah serta mematangkan telur sebelum menularkan DBD ke anggota keluarga lain. Ini SANGAT BERBAHAYA dan BUKAN benda mati aman!
4. "benda_mati" : HANYA jika barang kering keras netral NON-PAKAIAN (seperti laptop, buku, meja polos, lantai keramik kering, hp, mobil/motor kering, layar gelap/tertutup).
5. "jentik_sarang" : HANYA JIKA terlihat wadah air, genangan air, ember berair, selokan, talang berair, ban bekas berair, bak mandi, pot air, atau jentik nyamuk (larva/pupa).

TAHAP 2: ATURAN LOGIKA RISIKO & STRATEGI PEMUTUS SIKLUS HIDUP (Cycle Breaker):
- JIKA "manusia", "hewan", atau "benda_mati":
  * isBreedingSite: false
  * riskPercentage: 0
  * riskLevel: "Aman"
  * waterDetected: false
  * lifeCycleStage: "bukan_vektor"
  * cycleBreakerTitle: "Objek Aman (Bukan Habitat Siklus Nyamuk)"
  * cycleBreakerDetail: "Objek ini bukan habitat perindukan jentik maupun tempat istirahat nyamuk."
  * factors: Semua skor 0
  * scientificExplanation: Berikan penjelasan ramah bahwa objek ini terdeteksi sebagai [manusia/hewan/benda mati netral] dan bukan bagian dari habitat siklus hidup nyamuk.
  * actionSteps: ["Objek aman.", "Arahkan kamera ke gantungan baju untuk memeriksa resting site, atau ke genangan air untuk memeriksa jentik."]

- JIKA "vektor_istirahat" (Gantungan Baju / Tumpukan Kain):
  * isBreedingSite: true (titik bahaya resting site vektor)
  * waterDetected: false
  * riskPercentage: 65 - 85% (Tergantung banyaknya tumpukan baju dan kegelapan ruangan)
  * riskLevel: "Tinggi" atau "Sedang"
  * lifeCycleStage: "dewasa_istirahat"
  * cycleBreakerTitle: "Putus Siklus Nyamuk Dewasa (Resting Site Interruption)"
  * cycleBreakerDetail: "Nyamuk Aedes betina membutuhkan kain bekas berbau keringat untuk beristirahat dan mematangkan telur setelah menggigit. Menghilangkan baju gantung akan memutus tempat berlindung nyamuk dewasa sehingga tidak bisa bertahan hidup di dalam rumah dan tidak sempat bertelur."
  * factors:
    1. Wadah/Penampung (containerScore: 0): "Bukan wadah air (fase terestrial dewasa)"
    2. Stagnasi Air (waterStagnancyScore: 0): "Tidak ada genangan air"
    3. Kondisi Lingkungan Teduh (environmentScore: 18 - 20): "Lipatan kain gelap dan teduh sangat disukai nyamuk Aedes beristirahat"
    4. Seresah/Atraktan Organik (debrisScore: 9 - 10): "Aroma keringat, asam laktat, dan sebum pada pakaian bekas pakai adalah magnet penarik nyamuk DBD"
  * scientificExplanation: "Gantungan pakaian bekas pakai adalah resting site (tempat peristirahatan) favorit nyamuk Aedes aegypti dewasa. Nyamuk berlindung di lipatan kain gelap setelah menghisap darah manusia untuk mencerna darah dan mematangkan telurnya sebelum mencari wadah air untuk bertelur."
  * actionSteps: [
      "Pindahkan pakaian kotor ke dalam keranjang tertutup atau langsung cuci dengan deterjen.",
      "Hindari menggantung pakaian bekas pakai di belakang pintu kamar lebih dari 24 jam.",
      "Buka jendela di siang hari agar sirkulasi udara dan cahaya matahari masuk (nyamuk menghindari angin dan cahaya terang).",
      "Gunakan semprotan repelen alami atau raket nyamuk di sudut gantungan untuk membasmi nyamuk dewasa yang bersembunyi."
    ]

- JIKA "jentik_sarang" (Wadah Air / Genangan):
  * isBreedingSite: true
  * waterDetected: true
  * lifeCycleStage: "jentik_akuatik"
  * cycleBreakerTitle: "Putus Siklus Jentik & Pupa (Aquatic Metamorphosis Interruption)"
  * cycleBreakerDetail: "Siklus metamorfosis dari telur menjadi nyamuk dewasa membutuhkan waktu 7-10 hari di air. Menguras dan menyikat wadah seminggu sekali akan memusnahkan jentik sebelum sempat menjadi nyamuk dewasa terbang."
  * Hitung matematis skor (Total 0 - 100%):
    1. Wadah/Penampung (containerScore: 0 - 35%)
    2. Stagnasi Air (waterStagnancyScore: 0 - 35%)
    3. Kondisi Lingkungan Teduh (environmentScore: 0 - 20%)
    4. Seresah/Nutrisi Organik (debrisScore: 0 - 10%)
  * Tentukan riskLevel: 0-25 "Aman", 26-50 "Rendah", 51-70 "Sedang", 71-85 "Tinggi", 86-100 "Bahaya".
  * actionSteps: [
      "Kuras dan sikat dinding penampung air minimal 1x seminggu untuk merontokkan telur nyamuk.",
      "Tutup rapat semua tempat penampungan air (tandon, gentong, ember).",
      "Taburkan bubuk abate (larvasida) atau pelihara ikan pemakan jentik.",
      "Balikkan atau daur ulang wadah bekas yang berpotensi menampung air hujan (3M Plus)."
    ]

Format respon HARUS berupa JSON valid dengan struktur:
{
  "entityCategory": "jentik_sarang" | "vektor_istirahat" | "manusia" | "hewan" | "benda_mati",
  "isBreedingSite": boolean,
  "riskPercentage": number,
  "riskLevel": "Aman" | "Rendah" | "Sedang" | "Tinggi" | "Bahaya",
  "detectedObject": string,
  "waterDetected": boolean,
  "lifeCycleStage": "dewasa_istirahat" | "jentik_akuatik" | "bukan_vektor",
  "cycleBreakerTitle": string,
  "cycleBreakerDetail": string,
  "factors": {
    "containerScore": number,
    "containerReason": string,
    "waterStagnancyScore": number,
    "waterStagnancyReason": string,
    "environmentScore": number,
    "environmentReason": string,
    "debrisScore": number,
    "debrisReason": string
  },
  "scientificExplanation": string,
  "actionSteps": string[]
}`;

const VIDEO_VISION_PROMPT = `Kamu adalah AI Pakar Entomologi, Vektor Penyakit Tropis, dan Computer Vision di Zero-G Mosquito.
Tugasmu: Menganalisa 3 FRAME TEMPORAL BERURUTAN (Frame 0s, Frame 1.5s, Frame 3s) dari rekaman video kamera warga, membedakan entitas secara tajam, dan memberikan logika pemutus siklus hidup nyamuk:

ATURAN PALING KRUSIAL (ANTI-HALUSINASI & SENSOR TERTUTUP):
- JIKA frame gelap gulita, hitam, lensa tertutup jari/meja/benda, atau tidak tampak objek nyata:
  * entityCategory: "benda_mati"
  * detectedObject: "Kamera Tertutup / Layar Gelap (Tidak Ada Objek)"
  * isBreedingSite: false
  * motilityDetected: false
  * waterDetected: false
  * riskPercentage: 0
  * riskLevel: "Aman"
  * lifeCycleStage: "bukan_vektor"
  * cycleBreakerTitle: "Lensa Tertutup"
  * cycleBreakerDetail: "Pastikan lensa terbuka."
  * factors: Semua skor 0 (containerScore: 0, waterStagnancyScore: 0, motilityScore: 0, environmentScore: 0, debrisScore: 0)
  * scientificExplanation: "Kamera tertutup atau frame terlalu gelap. Tidak ada genangan air ataupun motilitas jentik hidup."
  * actionSteps: ["Pastikan lensa kamera tidak tertutup.", "Arahkan kamera ke gantungan baju atau air genangan."]
  * JANGAN PERNAH MENGARANG ADA SARANG/BAK MANDI PADA GAMBAR GELAP/TERTUTUP!

TAHAP 1: KLASIFIKASI ENTITAS (entityCategory):
Pilihlah salah satu dari 5 kategori berikut:
1. "manusia" : Jika objek bergerak adalah manusia (orang berbicara, berjalan, melambaikan tangan, wajah).
2. "hewan" : Jika objek bergerak adalah hewan/peliharaan (kucing bermain, ekor anjing bergerak, burung, ikan hias).
3. "vektor_istirahat" : JIKA OBJEK ADALAH GANTUNGAN BAJU, PAKAIAN KOTOR/BEKAS DI PINTU/DINDING, TUMPUKAN KAIN. Ini adalah RESTING SITE utama nyamuk Aedes aegypti dewasa. SANGAT BERBAHAYA untuk penularan DBD!
4. "benda_mati" : Jika objek adalah benda mati kering keras tanpa air non-pakaian (alat elektronik, meja, kursi, keramik, layar gelap/tertutup).
5. "jentik_sarang" : HANYA JIKA terlihat genangan air, wadah berair, selokan, atau air berisi jentik.

TAHAP 2: ATURAN LOGIKA RISIKO & UJI GERAK JENTIK (Larvae Wriggle Test):
- JIKA "manusia", "hewan", atau "benda_mati":
  * isBreedingSite: false
  * motilityDetected: false
  * waterDetected: false
  * riskPercentage: 0
  * riskLevel: "Aman"
  * lifeCycleStage: "bukan_vektor"
  * cycleBreakerTitle: "Objek Aman"
  * cycleBreakerDetail: "Bukan habitat nyamuk."
  * scientificExplanation: Gerakan temporal yang terdeteksi berasal dari [manusia/hewan/benda/noise sensor], bukan motilitas jentik nyamuk.
  * actionSteps: ["Objek aman.", "Arahkan kamera ke genangan air atau gantungan pakaian."]

- JIKA "vektor_istirahat" (Gantungan Baju / Tumpukan Kain):
  * isBreedingSite: true (titik bahaya resting site)
  * waterDetected: false
  * motilityDetected: false
  * riskPercentage: 65 - 85%
  * riskLevel: "Tinggi" atau "Sedang"
  * lifeCycleStage: "dewasa_istirahat"
  * cycleBreakerTitle: "Putus Siklus Nyamuk Dewasa (Resting Site Interruption)"
  * cycleBreakerDetail: "Menghilangkan baju gantung memutus tempat istirahat & perlindungan nyamuk dewasa agar tidak bisa bertahan hidup di dalam rumah dan tidak sempat bertelur."
  * factors: containerScore: 0, waterStagnancyScore: 0, motilityScore: 0, environmentScore: 10 (maks 10), debrisScore: 10 (maks 10)
  * scientificExplanation: "Gantungan baju bekas pakai adalah resting site favorit nyamuk Aedes aegypti dewasa untuk mencerna darah sebelum mencari genangan air untuk bertelur."
  * actionSteps: [
      "Pindahkan pakaian kotor ke dalam keranjang tertutup atau langsung cuci.",
      "Hindari menggantung pakaian bekas di kamar lebih dari 24 jam.",
      "Buka ventilasi dan pencahayaan agar kamar terang dan berangin.",
      "Gunakan perangkap nyamuk UV atau raket nyamuk di sudut gantungan."
    ]

- JIKA "jentik_sarang":
  * isBreedingSite: true
  * waterDetected: true
  * lifeCycleStage: "jentik_akuatik"
  * cycleBreakerTitle: "Putus Siklus Jentik & Pupa (Aquatic Phase Interruption)"
  * cycleBreakerDetail: "Kuras wadah minimal 1x seminggu untuk memutus siklus metamorfosis jentik (7-10 hari) sebelum berkembang menjadi nyamuk dewasa terbang."
  * Lakukan "Larvae Wriggle Test": amati apakah ada organisme mikro meliuk (S-shape wriggling) antar frame 1, 2, dan 3.
  * Hitung matematis skor (Total 0 - 100%):
    1. Wadah Buatan (containerScore: 0 - 25%)
    2. Stagnasi Air (waterStagnancyScore: 0 - 25%)
    3. Motilitas Gerak Jentik Hidup (motilityScore: 0 - 30%)
    4. Faktor Lingkungan Teduh (environmentScore: 0 - 10%)
    5. Nutrisi Organik (debrisScore: 0 - 10%)
  * Tentukan riskLevel: 0-25 "Aman", 26-50 "Rendah", 51-70 "Sedang", 71-85 "Tinggi", 86-100 "Bahaya".
  * actionSteps: [
      "Kuras dan sikat dinding penampung air minimal 1x seminggu.",
      "Tutup rapat semua tempat penampungan air.",
      "Taburkan bubuk abate atau pelihara ikan pemakan jentik.",
      "Balikkan atau buang wadah bekas penampung air hujan (3M Plus)."
    ]

Format respon HARUS berupa JSON valid dengan struktur:
{
  "entityCategory": "jentik_sarang" | "vektor_istirahat" | "manusia" | "hewan" | "benda_mati",
  "isBreedingSite": boolean,
  "riskPercentage": number,
  "riskLevel": "Aman" | "Rendah" | "Sedang" | "Tinggi" | "Bahaya",
  "detectedObject": string,
  "waterDetected": boolean,
  "motilityDetected": boolean,
  "lifeCycleStage": "dewasa_istirahat" | "jentik_akuatik" | "bukan_vektor",
  "cycleBreakerTitle": string,
  "cycleBreakerDetail": string,
  "factors": {
    "containerScore": number,
    "containerReason": string,
    "waterStagnancyScore": number,
    "waterStagnancyReason": string,
    "motilityScore": number,
    "motilityReason": string,
    "environmentScore": number,
    "environmentReason": string,
    "debrisScore": number,
    "debrisReason": string
  },
  "scientificExplanation": string,
  "actionSteps": string[]
}`;

export default function CameraScanner({
  currentUser,
  onPinToRadar,
  onNavigateToRadar,
  onConsultAI
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Modes: Photo vs 3-second Video Burst
  const [scanMode, setScanMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);

  // Scanning & Results
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState('');
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [isPlayingFrames, setIsPlayingFrames] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScanAnalysisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [landmarkInput, setLandmarkInput] = useState('');

  // Radar pinning states
  const [pinStatus, setPinStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pinMessage, setPinMessage] = useState('');

  // Auto-play loop for temporal frames animation
  useEffect(() => {
    let timer: number;
    if (isPlayingFrames && capturedFrames.length > 1) {
      timer = window.setInterval(() => {
        setActiveFrameIndex((prev) => (prev + 1) % capturedFrames.length);
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isPlayingFrames, capturedFrames.length]);

  // Camera stream init
  useEffect(() => {
    let isCancelled = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraActive(false);
      setCameraError(
        'Kamera live memerlukan browser modern & koneksi aman (HTTPS/localhost). Anda bisa menggunakan tombol unggah/kamera bawaan HP di bawah.'
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      .then(async (newStream) => {
        if (isCancelled) {
          newStream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play().catch(() => {});
        }

        if (!isCancelled) {
          setCameraActive(true);
          setCameraError(null);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCameraActive(false);
          setCameraError(
            'Kamera tidak dapat diakses langsung. Anda bisa menggunakan tombol unggah/kamera bawaan HP di bawah.'
          );
        }
      });

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Helper to snap canvas frame from video element
  const captureFrameFromVideo = useCallback(async (videoElem: HTMLVideoElement): Promise<EnhancementResult> => {
    return await enhanceCameraImage(videoElem);
  }, []);

  // Run AI Vision inference with Multi-Model Fallback & Hardware Black Screen Guard
  const runVisionAI = async (
    frames: EnhancementResult[],
    mode: 'photo' | 'video'
  ) => {
    setIsScanning(true);
    setScanError(null);

    // ZERO-TOLERANCE HARDWARE CHECK:
    // If the captured frames are completely dark / covered camera lens,
    // immediately return zero-risk safe response without calling AI to eliminate any hallucinations!
    const allFramesBlack = frames.every((f) => f.isBlackScreen);
    if (allFramesBlack) {
      const blackScreenResult: ScanAnalysisResult = {
        entityCategory: 'benda_mati',
        isBreedingSite: false,
        riskPercentage: 0,
        riskLevel: 'Aman',
        detectedObject: 'Lensa Kamera Tertutup / Layar Gelap',
        waterDetected: false,
        motilityDetected: false,
        factors: {
          containerScore: 0,
          containerReason: 'Tidak ada wadah air yang terlihat (lensa tertutup/gelap)',
          waterStagnancyScore: 0,
          waterStagnancyReason: 'Tidak ada genangan air yang terdeteksi',
          motilityScore: 0,
          motilityReason: 'Sensor optik tertutup, tidak ada motilitas organisme',
          environmentScore: 0,
          environmentReason: 'Pencahayaan 0%, bukan habitat nyamuk',
          debrisScore: 0,
          debrisReason: 'Tidak ada seresah organik yang tampak'
        },
        scientificExplanation:
          'Kamera terdeteksi tertutup atau berada di kegelapan total tanpa objek visual. Sistem mengonfirmasi tidak ada indikasi wadah genangan air ataupun jentik nyamuk pada tangkapan ini.',
        actionSteps: [
          'Lepaskan penutup kamera atau pastikan jari tidak menutupi lensa.',
          'Nyalakan lampu atau arahkan kamera ke area yang memiliki pencahayaan cukup.',
          'Arahkan langsung ke genangan air, ember, bak mandi, atau selokan jika ingin memindai potensi jentik.'
        ],
        scanMode: mode,
        capturedFrames: frames.map((f) => f.previewUrl)
      };

      setAnalysisResult(blackScreenResult);
      playSuccessChime();
      triggerHaptic(30);
      setIsScanning(false);
      setScanStepText('');
      setIsRecording(false);
      return;
    }

    setScanStepText(
      mode === 'video'
        ? 'Membedakan entitas (manusia/hewan/benda/jentik) & motilitas...'
        : 'Mengidentifikasi objek & menghitung persentase risiko...'
    );

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Kunci API Gemini (VITE_GEMINI_API_KEY) belum terpasang di .env.local');

      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

      const parts: Array<string | { inlineData: { mimeType: string; data: string } }> = [
        mode === 'video' ? VIDEO_VISION_PROMPT : PHOTO_VISION_PROMPT
      ];

      frames.forEach((f, idx) => {
        if (mode === 'video') {
          parts.push(`--- TEMPORAL FRAME ${idx + 1} (t = ${idx * 1.5}s) ---`);
        }
        parts.push({
          inlineData: {
            mimeType: f.mimeType,
            data: f.base64Data
          }
        });
      });

      let parsed: ScanAnalysisResult | null = null;
      let lastErr: unknown = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json'
            }
          });

          const response = await model.generateContent(parts);
          const rawText = response.response.text();
          const cleanJson = rawText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          parsed = JSON.parse(cleanJson);
          if (parsed && typeof parsed === 'object') {
            break;
          }
        } catch (e) {
          console.warn(`Vision model ${modelName} gagal, mencoba model cadangan...`, e);
          lastErr = e;
        }
      }

      if (!parsed) {
        throw lastErr || new Error('Gagal mendapatkan respon analisis dari AI Vision.');
      }

      // Safeguard: Classify safe non-vector vs hazardous breeding & resting sites
      const isEntitySafe =
        parsed.entityCategory === 'manusia' ||
        parsed.entityCategory === 'hewan' ||
        parsed.entityCategory === 'benda_mati';

      const isRestingSite = parsed.entityCategory === 'vektor_istirahat';

      const finalIsBreedingSite = isEntitySafe
        ? false
        : (isRestingSite ? true : (parsed.isBreedingSite !== undefined ? parsed.isBreedingSite : true));

      const finalRiskPercentage = isEntitySafe
        ? 0
        : (parsed.riskPercentage ?? (isRestingSite ? 75 : 0));

      const finalRiskLevel = isEntitySafe
        ? 'Aman'
        : (parsed.riskLevel || (isRestingSite ? 'Tinggi' : 'Aman'));

      // Determine life cycle stage and cycle breaker strategy
      let finalLifeCycleStage = parsed.lifeCycleStage;
      let finalCycleBreakerTitle = parsed.cycleBreakerTitle;
      let finalCycleBreakerDetail = parsed.cycleBreakerDetail;

      if (isRestingSite) {
        finalLifeCycleStage = 'dewasa_istirahat';
        finalCycleBreakerTitle = finalCycleBreakerTitle || 'Putus Siklus Nyamuk Dewasa (Resting Site)';
        finalCycleBreakerDetail = finalCycleBreakerDetail || 'Nyamuk betina dewasa memanfaatkan gantungan baju & tumpukan kain berbau keringat untuk beristirahat dan mematangkan telur. Menghilangkan baju gantung akan memutus tempat perlindungan nyamuk dewasa sehingga tidak bisa bertahan hidup di dalam rumah dan tidak sempat bertelur.';
      } else if (parsed.entityCategory === 'jentik_sarang') {
        finalLifeCycleStage = 'jentik_akuatik';
        finalCycleBreakerTitle = finalCycleBreakerTitle || 'Putus Siklus Akuatik Jentik & Pupa (Metamorfosis)';
        finalCycleBreakerDetail = finalCycleBreakerDetail || 'Siklus metamorfosis dari telur menjadi nyamuk dewasa membutuhkan waktu 7-10 hari di air. Menguras dan menyikat wadah seminggu sekali akan memusnahkan jentik sebelum sempat menjadi nyamuk dewasa terbang.';
      } else {
        finalLifeCycleStage = 'bukan_vektor';
        finalCycleBreakerTitle = 'Objek Aman (Bukan Bagian Siklus Nyamuk)';
        finalCycleBreakerDetail = 'Objek ini bukan habitat perindukan jentik maupun tempat istirahat nyamuk dewasa.';
      }

      const result: ScanAnalysisResult = {
        entityCategory: parsed.entityCategory || (isRestingSite ? 'vektor_istirahat' : 'jentik_sarang'),
        isBreedingSite: finalIsBreedingSite,
        riskPercentage: finalRiskPercentage,
        riskLevel: finalRiskLevel,
        detectedObject: parsed.detectedObject || (isRestingSite ? 'Gantungan Pakaian / Baju Bekas (Resting Site Nyamuk Dewasa)' : 'Objek Terdeteksi'),
        waterDetected: Boolean(parsed.waterDetected),
        motilityDetected: parsed.motilityDetected,
        lifeCycleStage: finalLifeCycleStage,
        cycleBreakerTitle: finalCycleBreakerTitle,
        cycleBreakerDetail: finalCycleBreakerDetail,
        factors: parsed.factors || {
          containerScore: 0,
          containerReason: '-',
          waterStagnancyScore: 0,
          waterStagnancyReason: '-',
          environmentScore: isRestingSite ? 18 : 0,
          environmentReason: isRestingSite ? 'Lipatan pakaian gelap disukai nyamuk istirahat' : '-',
          debrisScore: isRestingSite ? 10 : 0,
          debrisReason: isRestingSite ? 'Aroma keringat manusia menarik nyamuk Aedes' : '-'
        },
        scientificExplanation: parsed.scientificExplanation || '',
        actionSteps: parsed.actionSteps || [],
        scanMode: mode,
        capturedFrames: frames.map((f) => f.previewUrl)
      };

      setAnalysisResult(result);
      if (result.isBreedingSite) {
        playHazardAlert();
        triggerHaptic([40, 80, 40]);
      } else {
        playSuccessChime();
        triggerHaptic(30);
      }
    } catch (err: unknown) {
      console.error('AI Vision Error:', err);
      const errMsg = err instanceof Error ? err.message : 'Koneksi AI gagal';
      setScanError(`Gagal menganalisis visual: ${errMsg}. Silakan periksa koneksi internet atau muat ulang halaman.`);
      setAnalysisResult(null);
    } finally {
      setIsScanning(false);
      setScanStepText('');
      setIsRecording(false);
    }
  };

  // 1-Photo Snap
  const handleSnapPhoto = async () => {
    if (!videoRef.current || isScanning) return;
    try {
      setIsScanning(true);
      setScanStepText('Mengambil gambar & auto-enhance...');
      const enhanced = await captureFrameFromVideo(videoRef.current);
      setCapturedFrames([enhanced.previewUrl]);
      setActiveFrameIndex(0);
      await runVisionAI([enhanced], 'photo');
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  // 3-Second Video Burst Recording & Temporal Sampling
  const handleRecordVideoBurst = async () => {
    if (!videoRef.current || isScanning || isRecording) return;
    try {
      setIsRecording(true);
      setCountdownSeconds(3);

      const frames: EnhancementResult[] = [];

      // Frame 1 at t = 0s
      setScanStepText('Merekam Frame 1/3 (t = 0.0s)...');
      const frame1 = await captureFrameFromVideo(videoRef.current);
      frames.push(frame1);

      // Wait 1.5s
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCountdownSeconds(1.5);
      setScanStepText('Merekam Frame 2/3 (t = 1.5s)...');
      const frame2 = await captureFrameFromVideo(videoRef.current);
      frames.push(frame2);

      // Wait 1.5s
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCountdownSeconds(0);
      setScanStepText('Merekam Frame 3/3 (t = 3.0s)...');
      const frame3 = await captureFrameFromVideo(videoRef.current);
      frames.push(frame3);

      setCapturedFrames(frames.map((f) => f.previewUrl));
      setActiveFrameIndex(0);
      setIsPlayingFrames(true);

      // Send 3 temporal keyframes to Gemini Vision
      await runVisionAI(frames, 'video');
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      setIsRecording(false);
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsScanning(true);
      setScanStepText('Memproses foto...');
      const enhanced = await enhanceCameraImage(file);
      setCapturedFrames([enhanced.previewUrl]);
      setActiveFrameIndex(0);
      await runVisionAI([enhanced], 'photo');
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Handle Video File Upload (Extract 3 keyframes via canvas)
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsScanning(true);
      setScanStepText('Mengekstrak temporal frame dari video...');

      const videoUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = videoUrl;
      tempVideo.muted = true;
      tempVideo.playsInline = true;

      await new Promise((resolve, reject) => {
        tempVideo.onloadedmetadata = () => resolve(true);
        tempVideo.onerror = reject;
      });

      const duration = tempVideo.duration || 3;
      const t1 = 0.1;
      const t2 = Math.max(0.5, duration / 2);
      const t3 = Math.max(1, duration - 0.2);

      const seekAndCapture = async (time: number): Promise<EnhancementResult> => {
        return new Promise((resolve) => {
          tempVideo.currentTime = time;
          tempVideo.onseeked = async () => {
            const res = await enhanceCameraImage(tempVideo);
            resolve(res);
          };
        });
      };

      const frame1 = await seekAndCapture(t1);
      const frame2 = await seekAndCapture(t2);
      const frame3 = await seekAndCapture(t3);

      URL.revokeObjectURL(videoUrl);

      const frames = [frame1, frame2, frame3];
      setCapturedFrames(frames.map((f) => f.previewUrl));
      setActiveFrameIndex(0);
      setIsPlayingFrames(true);

      await runVisionAI(frames, 'video');
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Pin Result to Supabase Radar (Only allowed if it's a breeding site)
  const handlePinReport = () => {
    if (!analysisResult || !analysisResult.isBreedingSite) return;
    setPinStatus('saving');
    setPinMessage('Membaca GPS & mengompres foto lapangan...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let compressedPhoto: string | undefined = undefined;
        if (capturedFrames.length > 0) {
          try {
            compressedPhoto = await compressImageToDataUrl(capturedFrames[0], 480, 480, 0.7);
          } catch {
            // fallback
          }
        }

        const modeTag = analysisResult.scanMode === 'video' ? '🎥 Video Motilitas' : '📸 Foto';
        const meta: ReportMetadata = {
          summary: `${analysisResult.riskLevel} (${analysisResult.riskPercentage}% - ${analysisResult.detectedObject} [${modeTag}])`,
          fieldPhoto: compressedPhoto,
          landmark: landmarkInput.trim() || undefined,
          accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy * 10) / 10 : undefined,
          reportedBy: currentUser?.name || 'Warga Komunitas'
        };

        const reportPayload: MosquitoReport = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          status: serializeReportStatus(meta)
        };

        try {
          if (!navigator.onLine) {
            throw new Error('Offline');
          }

          const { data, error } = await supabase
            .from('reports')
            .insert({
              latitude: reportPayload.latitude,
              longitude: reportPayload.longitude,
              status: reportPayload.status
            })
            .select()
            .single();

          if (error) throw error;

          const savedReport = data as MosquitoReport;
          onPinToRadar(savedReport);
          setPinStatus('saved');
          setPinMessage('Berhasil disematkan ke Radar Peta warga beserta foto lapangan!');
          playSuccessChime();
          triggerHaptic([30, 50, 30]);

          setTimeout(() => {
            onNavigateToRadar();
          }, 1500);
        } catch {
          // OFFLINE RESILIENCE: Save to local queue so user never loses report in dead zones!
          const offlineReport: MosquitoReport = {
            ...reportPayload,
            id: `offline-${Date.now()}`
          };
          enqueueOfflineReport(offlineReport, 'insert');
          onPinToRadar(offlineReport);
          setPinStatus('saved');
          setPinMessage('Disimpan ke antrean offline! Akan otomatis disinkronkan saat terhubung internet.');
          playSuccessChime();
          triggerHaptic([30, 50, 30]);

          setTimeout(() => {
            onNavigateToRadar();
          }, 1800);
        }
      },
      () => {
        setPinStatus('error');
        setPinMessage('Akses GPS ditolak untuk menyematkan pin.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Directly Report as Cleaned on the spot so it NEVER becomes a red danger pin on the active radar
  const handleCleanReport = () => {
    if (!analysisResult || !analysisResult.isBreedingSite) return;
    setPinStatus('saving');
    setPinMessage('Menyimpan laporan pembersihan beserta foto...');
    playTapSound();
    triggerHaptic(20);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let reportPayload: MosquitoReport;
        try {
          let compressedPhoto: string | undefined = undefined;
          if (capturedFrames.length > 0) {
            try {
              compressedPhoto = await compressImageToDataUrl(capturedFrames[0], 480, 480, 0.7);
            } catch {
              // fallback
            }
          }

          const meta: ReportMetadata = {
            summary: `Dibersihkan: Langsung Ditangani Pasca-Scan (${analysisResult.detectedObject})`,
            fieldPhoto: compressedPhoto,
            landmark: landmarkInput.trim() || undefined,
            accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy * 10) / 10 : undefined,
            cleanedAction: 'Langsung Ditangani Pasca-Scan',
            cleanedBy: currentUser?.name || 'Warga Komunitas',
            cleanedPhoto: compressedPhoto,
            cleanedAt: new Date().toISOString()
          };

          reportPayload = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            status: serializeReportStatus(meta)
          };

          const { data, error } = await supabase
            .from('reports')
            .insert({
              latitude: reportPayload.latitude,
              longitude: reportPayload.longitude,
              status: reportPayload.status
            })
            .select()
            .single();

          if (error) throw error;

          const savedReport = data as MosquitoReport;
          onPinToRadar(savedReport);
          setPinStatus('saved');
          setPinMessage('Hebat! Titik aman tersimpan di riwayat bersih tanpa memicu titik merah radar.');
          playSuccessChime();
          triggerHaptic([40, 60, 40]);

          setTimeout(() => {
            onNavigateToRadar();
          }, 1800);
        } catch {
          // OFFLINE RESILIENCE: Save to offline queue
          const offlineReport: MosquitoReport = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            status: `Dibersihkan: Langsung Ditangani Pasca-Scan (${analysisResult.detectedObject})`,
            id: `offline-${Date.now()}`
          };
          enqueueOfflineReport(offlineReport, 'insert');
          onPinToRadar(offlineReport);
          setPinStatus('saved');
          setPinMessage('Tersimpan di antrean offline! Akan disinkronkan otomatis saat ada koneksi.');
          playSuccessChime();
          triggerHaptic([40, 60, 40]);

          setTimeout(() => {
            onNavigateToRadar();
          }, 1800);
        }
      },
      () => {
        setPinStatus('error');
        setPinMessage('Akses GPS ditolak untuk menyimpan laporan.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const resetScan = () => {
    setCapturedFrames([]);
    setActiveFrameIndex(0);
    setIsPlayingFrames(false);
    setAnalysisResult(null);
    setScanError(null);
    setPinStatus('idle');
    setPinMessage('');
    setLandmarkInput('');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Bahaya':
        return 'text-red-500 border-red-500/40 bg-red-950/40';
      case 'Tinggi':
        return 'text-orange-400 border-orange-500/40 bg-orange-950/40';
      case 'Sedang':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      default:
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    }
  };

  // Helper to render Category Badge
  const renderCategoryBadge = (category: EntityCategory) => {
    switch (category) {
      case 'manusia':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/70 border border-sky-400/40 text-sky-300 text-xs font-semibold">
            <User size={13} className="text-sky-400" />
            <span>Terdeteksi Manusia (Bukan Sarang Nyamuk)</span>
          </div>
        );
      case 'hewan':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            <PawPrint size={13} className="text-amber-400" />
            <span>Terdeteksi Hewan / Satwa (Bukan Sarang Nyamuk)</span>
          </div>
        );
      case 'benda_mati':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-white/20 text-slate-300 text-xs font-semibold">
            <Package size={13} className="text-slate-400" />
            <span>Terdeteksi Benda Mati Kering (Aman)</span>
          </div>
        );
      case 'vektor_istirahat':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-400/50 text-rose-300 text-xs font-semibold shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse">
            <Shirt size={13} className="text-rose-400" />
            <span>Resting Site Nyamuk Dewasa (Gantungan Baju / Pakaian) - Bahaya DBD</span>
          </div>
        );
      case 'jentik_sarang':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/70 border border-teal-400/40 text-teal-300 text-xs font-semibold">
            <Bug size={13} className="text-teal-400 animate-pulse" />
            <span>Titik Genangan / Potensi Sarang Nyamuk</span>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Hidden File Inputs: Gallery & Folder Selection (NO capture attribute) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
      {/* Fallback Direct Camera Capture Input (WITH capture) */}
      <input
        ref={fallbackCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Mode Switcher Pill */}
      {!analysisResult && (
        <div className="glass-pill flex items-center gap-1.5 p-1 mb-4 z-20 shadow-md">
          <button
            type="button"
            onClick={() => setScanMode('photo')}
            disabled={isScanning || isRecording}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              scanMode === 'photo'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={14} />
            <span>Foto Statis</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode('video')}
            disabled={isScanning || isRecording}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              scanMode === 'video'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video size={14} />
            <span>Video Gerak Jentik (3s)</span>
          </button>
        </div>
      )}

      {/* Main Viewfinder Window - 100% Clean Optical Viewfinder (Zero Background Interference) */}
      <div className="relative w-full aspect-[4/5] sm:aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center touch-pan-y select-none">
        {/* Live Camera View (Pure crystal clear optical stream) */}
        {capturedFrames.length === 0 && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover pointer-events-none select-none ${cameraActive ? 'block' : 'hidden'}`}
          />
        )}

        {/* Captured Freeze-frame Preview with Smooth Crossfade */}
        {capturedFrames.length > 0 && (
          <div className="relative w-full h-full pointer-events-none select-none">
            <img
              src={capturedFrames[activeFrameIndex]}
              alt={`Frame ${activeFrameIndex + 1}`}
              className="w-full h-full object-cover crossfade-enter pointer-events-none select-none"
            />

            {/* Multi-frame selector pill */}
            {capturedFrames.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 z-30 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsPlayingFrames(!isPlayingFrames)}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors p-1"
                  title={isPlayingFrames ? 'Jeda Transisi' : 'Putar Transisi Gerak'}
                >
                  {isPlayingFrames ? <Pause size={14} /> : <Play size={14} />}
                </button>
                {capturedFrames.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveFrameIndex(idx);
                      setIsPlayingFrames(false);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      activeFrameIndex === idx
                        ? 'bg-teal-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {idx === 0 ? '0.0s' : idx === 1 ? '1.5s' : '3.0s'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback if camera stream is blocked */}
        {!cameraActive && capturedFrames.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 text-teal-400 animate-pulse">
              {scanMode === 'video' ? <Video size={32} /> : <Camera size={32} />}
            </div>
            <p className="text-sm max-w-xs">{cameraError || 'Menghubungkan ke sensor kamera...'}</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (scanMode === 'video') {
                    videoFileInputRef.current?.click();
                  } else {
                    fallbackCameraInputRef.current?.click();
                  }
                }}
                className="bg-teal-500 text-slate-950 px-4 py-2 rounded-full font-semibold text-xs tracking-wider uppercase flex items-center gap-2 hover:bg-teal-400 transition-all cursor-pointer"
              >
                <Camera size={15} /> Buka Kamera HP
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scanMode === 'video') {
                    videoFileInputRef.current?.click();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="bg-slate-800 text-slate-200 border border-white/10 px-4 py-2 rounded-full font-semibold text-xs tracking-wider uppercase flex items-center gap-2 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <Upload size={15} /> Pilih dari Galeri / Folder
              </button>
            </div>
          </div>
        )}

        {/* Scanning Reticle Overlays (Only show when camera is active or frames are loaded) */}
        {(cameraActive || capturedFrames.length > 0) && (
          <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-mono text-emerald-300">
                {scanMode === 'video' ? (
                  <>
                    <Activity size={12} className="text-emerald-400 animate-pulse" />
                    <span>UJI GERAK 3 DETIK</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                    <span>AI COMPUTER VISION</span>
                  </>
                )}
              </div>
              <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
            </div>

            {/* Center Target Box */}
            <div className="self-center flex items-center justify-center relative">
              <div className="w-44 h-44 border border-white/15 rounded-2xl flex items-center justify-center">
                <Scan size={32} className="text-emerald-400/30" />
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Scanning Laser / Burst Recording Progress with Animated Mosquito Loading Scanner */}
        {(isScanning || isRecording) && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <MosquitoLoadingScanner
              stepText={scanStepText}
              isRecording={isRecording}
              countdownSeconds={countdownSeconds}
            />
          </div>
        )}

        {/* Top Control Buttons */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {cameraActive && capturedFrames.length === 0 && (
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-white/10 backdrop-blur-md transition-all cursor-pointer"
              title="Ganti Kamera"
            >
              <RefreshCw size={18} />
            </button>
          )}

          {capturedFrames.length > 0 && !isScanning && (
            <button
              type="button"
              onClick={resetScan}
              className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-white/10 backdrop-blur-md transition-all cursor-pointer"
              title="Tutup & Ulangi"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Shutter Bar Controls (Bottom) */}
      {!analysisResult && (
        <div className="mt-6 flex items-center justify-center gap-8 w-full px-6">
          <button
            type="button"
            onClick={() => {
              if (scanMode === 'video') {
                videoFileInputRef.current?.click();
              } else {
                fileInputRef.current?.click();
              }
            }}
            disabled={isScanning || isRecording}
            className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title={scanMode === 'video' ? 'Unggah Video dari Galeri' : 'Unggah Foto dari Galeri'}
          >
            <Upload size={20} />
          </button>

          {/* Shutter Button (Adapts to Photo vs Video) */}
          {scanMode === 'photo' ? (
            <button
              type="button"
              onClick={handleSnapPhoto}
              disabled={isScanning}
              className="w-20 h-20 rounded-full p-1 border-4 border-emerald-500/70 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              title="Ambil Foto & Analisis"
            >
              <div className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center text-slate-950 font-bold">
                <Camera size={28} />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRecordVideoBurst}
              disabled={isScanning || isRecording}
              className={`w-20 h-20 rounded-full p-1 border-4 ${
                isRecording ? 'border-rose-500 animate-pulse' : 'border-rose-500/70'
              } flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50`}
              title="Rekam 3 Detik Uji Gerak Jentik"
            >
              <div
                className={`w-full h-full rounded-full ${
                  isRecording ? 'bg-rose-500 rounded-2xl scale-75' : 'bg-rose-500 hover:bg-rose-400'
                } transition-all flex items-center justify-center text-white`}
              >
                <Video size={28} />
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.requestFullscreen?.().catch(() => {});
              }
            }}
            className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center border border-white/10 transition-all cursor-pointer"
            title="Layar Penuh"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      )}

      {/* Error Notification Card if AI Fails */}
      {scanError && (
        <div className="mt-6 w-full bg-red-950/70 border border-red-500/40 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-red-200 text-xs shadow-xl animate-float">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-400 shrink-0" />
            <div>
              <p className="font-bold text-red-300">Pemberitahuan Analisis AI:</p>
              <p className="text-slate-300 mt-0.5">{scanError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetScan}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all"
          >
            Coba Ulangi
          </button>
        </div>
      )}

      {/* RESULT BOTTOM SHEET MODAL WITH BATIK ORNAMENTS */}
      {analysisResult && (
        <div className="mt-6 w-full rounded-3xl p-6 shadow-2xl space-y-6 tab-transition relative overflow-hidden bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25">
          <BatikKawungPattern opacity={0.1} className="text-emerald-400" />
          <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50" />
          <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90" />
          <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90" />
          <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180" />
          {/* Header & Score Metric */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="text-center sm:text-left space-y-1.5">
              {/* Entity Categorization Badge */}
              <div>{renderCategoryBadge(analysisResult.entityCategory)}</div>
              
              <h3 className="text-xl font-bold text-white tracking-tight">
                {analysisResult.detectedObject}
              </h3>
            </div>

            {/* Circular Risk Gauge Pill */}
            <div
              className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 backdrop-blur-md shadow-lg ${getRiskColor(
                analysisResult.riskLevel
              )}`}
            >
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Tingkat Risiko
                </p>
                <p className="text-xs font-semibold">{analysisResult.riskLevel}</p>
              </div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums font-mono">
                {analysisResult.riskPercentage}%
              </div>
            </div>
          </div>

          {/* Alert Banner if Non-Breeding Site (Human / Animal / Dry Object) */}
          {!analysisResult.isBreedingSite && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs shadow-md">
              <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Objek Aman Terkonfirmasi: </span>
                Sistem mengidentifikasi ini sebagai <strong>{analysisResult.detectedObject}</strong>, bukan genangan air ataupun sarang nyamuk. Tidak ada potensi vektor penyakit di titik ini.
              </div>
            </div>
          )}

          {/* MOSQUITO LIFE-CYCLE BREAKER MODULE (Memutus Siklus Hidup Nyamuk) */}
          {analysisResult.lifeCycleStage && analysisResult.lifeCycleStage !== 'bukan_vektor' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/70 via-slate-900/80 to-amber-950/60 border border-teal-500/30 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
                  <Scissors size={15} className="text-teal-400" />
                  <span>Logika Pemutus Siklus Hidup Nyamuk</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-200 border border-teal-500/40">
                  Target Intervensi: {analysisResult.lifeCycleStage === 'dewasa_istirahat' ? 'Fase Nyamuk Dewasa (Imago)' : 'Fase Jentik / Pupa (Air)'}
                </span>
              </div>

              {/* Visual 4-Stage Life Cycle Pipeline */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] py-1">
                {/* 1. Telur */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  analysisResult.lifeCycleStage === 'telur_dorman'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}>
                  <span className="text-xs">🥚 Telur</span>
                  <span className="text-[8px] opacity-75">Tahan Kering</span>
                </div>

                {/* 2. Jentik */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  analysisResult.lifeCycleStage === 'jentik_akuatik'
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200 font-bold shadow-[0_0_12px_rgba(244,63,94,0.4)] ring-1 ring-rose-400/50'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}>
                  <span className="text-xs">🐛 Jentik</span>
                  <span className="text-[8px] opacity-75">Air 6-8 Hari</span>
                </div>

                {/* 3. Pupa */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  analysisResult.lifeCycleStage === 'jentik_akuatik'
                    ? 'bg-rose-500/20 border-rose-400/70 text-rose-200 font-semibold'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}>
                  <span className="text-xs">🫧 Pupa</span>
                  <span className="text-[8px] opacity-75">Air 1-2 Hari</span>
                </div>

                {/* 4. Dewasa (Gantungan Baju) */}
                <div className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                  analysisResult.lifeCycleStage === 'dewasa_istirahat'
                    ? 'bg-rose-500/30 border-rose-400 text-rose-200 font-bold shadow-[0_0_14px_rgba(244,63,94,0.5)] ring-1 ring-rose-400'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}>
                  <span className="text-xs">🦟 Dewasa</span>
                  <span className="text-[8px] opacity-75">Baju Gantung</span>
                </div>
              </div>

              {/* Cycle Breaker Detail Explanation Box */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed space-y-1">
                <p className="font-semibold text-teal-300 text-[11px] flex items-center gap-1.5">
                  <span className="text-amber-400">⚡</span> {analysisResult.cycleBreakerTitle || 'Strategi Pemutus Rantai Vektor:'}
                </p>
                <p className="text-[11px] text-slate-300">
                  {analysisResult.cycleBreakerDetail}
                </p>
              </div>
            </div>
          )}

          {/* Temporal Frame Sequence Inspection Pill (Video Mode) */}
          {analysisResult.capturedFrames && analysisResult.capturedFrames.length > 1 && (
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-teal-400" />
                  Inspeksi Transisi Temporal Frame
                </span>
                <span className="text-[11px] text-teal-400 font-mono">
                  {activeFrameIndex === 0 ? 'Frame 0.0s' : activeFrameIndex === 1 ? 'Frame 1.5s' : 'Frame 3.0s'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {analysisResult.capturedFrames.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveFrameIndex(idx);
                      setIsPlayingFrames(false);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                      activeFrameIndex === idx
                        ? 'border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.5)] scale-[1.02]'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-white font-bold">
                      {idx === 0 ? '0.0s' : idx === 1 ? '1.5s' : '3.0s'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mathematical Breakdown Grid (Only relevant if breeding site) */}
          {analysisResult.isBreedingSite && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-teal-400" />
                Perhitungan Rincian Skor (Total 100%)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Wadah Air Buatan</span>
                    <span className="text-teal-400 font-mono font-bold">
                      {analysisResult.factors.containerScore} / {analysisResult.scanMode === 'video' ? '25%' : '35%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{analysisResult.factors.containerReason}</p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Stagnasi Genangan</span>
                    <span className="text-teal-400 font-mono font-bold">
                      {analysisResult.factors.waterStagnancyScore} / {analysisResult.scanMode === 'video' ? '25%' : '35%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{analysisResult.factors.waterStagnancyReason}</p>
                </div>

                {/* Video Motility Factor */}
                {analysisResult.scanMode === 'video' && analysisResult.factors.motilityScore !== undefined && (
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-500/20 space-y-1 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                        <Activity size={13} className="text-teal-400 animate-pulse" />
                        Uji Motilitas Gerak Jentik (Wriggle Test)
                      </span>
                      <span className="text-teal-400 font-mono font-bold">
                        {analysisResult.factors.motilityScore} / 30%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {analysisResult.factors.motilityReason ||
                        (analysisResult.motilityDetected
                          ? 'Terdeteksi pergerakan organisme meliuk aktif dalam air.'
                          : 'Tidak terdeteksi pergerakan jentik hidup antar frame temporal.')}
                    </p>
                  </div>
                )}

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Kondisi Teduh/Lembab</span>
                    <span className="text-teal-400 font-mono font-bold">
                      {analysisResult.factors.environmentScore} / {analysisResult.scanMode === 'video' ? '10%' : '20%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{analysisResult.factors.environmentReason}</p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Materi Organik / Nutrisi</span>
                    <span className="text-teal-400 font-mono font-bold">
                      {analysisResult.factors.debrisScore} / 10%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{analysisResult.factors.debrisReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Scientific Explanation */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-400" />
              Penjelasan Biologis & Diagnostik AI
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analysisResult.scientificExplanation}
            </p>
          </div>

          {/* Concrete Action Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Langkah Penanganan Mandiri
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {analysisResult.actionSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-950/30 p-2 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Physical Landmark / Ground Condition Input */}
          {analysisResult.isBreedingSite && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/25 space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Compass size={14} className="text-teal-400" />
                <span>Patokan Fisik / Catatan Lapangan (Opsional):</span>
              </label>
              <input
                type="text"
                value={landmarkInput}
                onChange={(e) => setLandmarkInput(e.target.value)}
                placeholder="Contoh: Belakang pos ronda RT 03, drum dekat pohon pisang"
                className="w-full bg-slate-950/80 border border-white/10 focus:border-teal-400/60 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400">
                Foto hasil scan dan patokan ini otomatis disimpan ke radar agar lokasi akurat dan bisa ditelusuri warga.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            {analysisResult.isBreedingSite ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePinReport}
                  disabled={pinStatus === 'saving' || pinStatus === 'saved'}
                  className="bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-400 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm active:scale-[0.98]"
                >
                  {pinStatus === 'saving' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Menyematkan...
                    </>
                  ) : pinStatus === 'saved' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Tersimpan di Radar!
                    </>
                  ) : (
                    <>
                      <MapPin size={18} />
                      Tandai Bahaya di Radar
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCleanReport}
                  disabled={pinStatus === 'saving' || pinStatus === 'saved'}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm border border-emerald-400/40 active:scale-[0.98]"
                >
                  <ShieldCheck size={18} />
                  <span>Langsung Bersihkan (Aman)</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/80 border border-emerald-500/30 text-emerald-400 font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs">
                <ShieldCheck size={18} />
                <span>Titik Aman — Tidak Perlu Disematkan ke Radar</span>
              </div>
            )}

            {/* Direct Bridge from AI Photo to AI Chat */}
            {onConsultAI && (
              <button
                type="button"
                onClick={() => {
                  const currentPhoto = capturedFrames[activeFrameIndex] || capturedFrames[0];
                  onConsultAI({
                    photoUrl: currentPhoto,
                    summary: `${analysisResult.riskLevel} (${analysisResult.riskPercentage}% - ${analysisResult.detectedObject})`,
                    explanation: analysisResult.scientificExplanation
                  });
                }}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(20,184,166,0.35)] transition-all cursor-pointer text-xs sm:text-sm border border-emerald-300/30 active:scale-[0.98]"
              >
                <Bot size={18} className="text-emerald-200" />
                <span>💬 Tanya AI Chat Seputar Hasil Foto Ini</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetScan}
              className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-200 font-semibold py-3 px-6 rounded-2xl transition-all cursor-pointer text-xs"
            >
              Scan Objek Lain
            </button>
          </div>

          {pinMessage && (
            <p
              className={`text-center text-xs font-semibold ${
                pinStatus === 'error' ? 'text-red-400' : 'text-teal-400'
              }`}
            >
              {pinMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
