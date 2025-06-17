'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { saveAttendance } from '@/lib/attendance';
import { PrefectRole } from '@/lib/types';
import {
  QrCode,
  ScanLine,
  Download,
  Shield,
  Printer,
  Loader,
  RefreshCw,
  Upload,
  Camera,
  CameraOff,
  Share2,
  Copy,
  Smartphone,
  Zap,
  CheckCircle,
  Info,
  Settings,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const roles: PrefectRole[] = [
  'Head',
  'Deputy',
  'Senior Executive',
  'Executive',
  'Super Senior',
  'Senior',
  'Junior',
  'Sub',
  'Apprentice',
];

export default function QRCodePage() {
  const [prefectNumber, setPrefectNumber] = useState('');
  const [role, setRole] = useState<PrefectRole | ''>('');
  const [qrData, setQrData] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isWaitingForScan, setIsWaitingForScan] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [qrSize, setQrSize] = useState(300);
  const [qrErrorLevel, setQrErrorLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [scanHistory, setScanHistory] = useState<{
    prefectNumber: string;
    role: string;
    timestamp: string;
    status: 'success' | 'late';
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scanSuccessCount, setScanSuccessCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraResolution, setCameraResolution] = useState(720);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Helper: Convert QRCode SVG to PNG data URL
  const getQRCodeImageData = useCallback(async (): Promise<string> => {
    const svgElement = qrContainerRef.current?.querySelector('svg');
    if (!svgElement) throw new Error('QR code element not found');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
    });
  }, []);

  // Generate QR Code with our system identifier
  const generateQRCode = useCallback(() => {
    if (!prefectNumber || !role) {
      toast.error('Missing Information', {
        description: 'Please enter prefect number and select role',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const qrSecret = process.env.NEXT_PUBLIC_QR_SECRET || 'secret';
      const timestamp = new Date().toISOString();
      const data = {
        type: 'prefect_attendance',
        prefectNumber,
        role,
        system: 'our_app', // system identifier used to ensure authenticity
        timestamp,
        hash: btoa(`${prefectNumber}_${role}_${timestamp}_${qrSecret}`),
      };
      setQrData(JSON.stringify(data));
      
      // Play success sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
      
      toast.success('QR Code Generated', {
        description: 'Your attendance QR code is ready',
      });
    } catch (error) {
      console.error('QR generation failed:', error);
      toast.error('Generation Failed', {
        description: 'Could not generate QR code. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prefectNumber, role]);

  const downloadQRCode = useCallback(async () => {
    if (!qrData) {
      toast.error('No QR Code', {
        description: 'Please generate a QR code first',
      });
      return;
    }
    setIsDownloading(true);
    try {
      const pngUrl = await getQRCodeImageData();
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `prefect_qr_${prefectNumber}_${role}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code Downloaded', {
        description: 'QR code has been saved to your device',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download Failed', {
        description: 'Could not download QR code. Please try again.',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [qrData, prefectNumber, role, getQRCodeImageData]);

  const printQRCode = useCallback(async () => {
    if (!qrData) {
      toast.error('No QR Code', {
        description: 'Please generate a QR code first',
      });
      return;
    }
    try {
      const pngUrl = await getQRCodeImageData();
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Failed to open print window');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body { margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; }
              img { max-width: 100%; height: auto; margin-bottom: 20px; }
              .info { font-family: Arial, sans-serif; text-align: center; margin-bottom: 30px; }
              .prefect-info { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .timestamp { font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="info">
              <div class="prefect-info">${role} - ${prefectNumber}</div>
              <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
            </div>
            <img src="${pngUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Print Failed', {
        description: 'Could not print QR code. Please try again.',
      });
    }
  }, [qrData, role, prefectNumber, getQRCodeImageData]);

  const shareQRCode = useCallback(async () => {
    if (!qrData) {
      toast.error('No QR Code', {
        description: 'Please generate a QR code first',
      });
      return;
    }
    
    try {
      const pngUrl = await getQRCodeImageData();
      
      // Check if Web Share API is available
      if (navigator.share) {
        const blob = await (await fetch(pngUrl)).blob();
        const file = new File([blob], `prefect_qr_${prefectNumber}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: 'Prefect Attendance QR Code',
          text: `QR Code for ${role} ${prefectNumber}`,
          files: [file]
        });
        
        toast.success('QR Code Shared', {
          description: 'Your QR code has been shared successfully',
        });
      } else {
        // Fallback to clipboard copy
        await copyQRToClipboard();
      }
    } catch (error) {
      console.error('Share error:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Share Failed', {
          description: 'Could not share QR code. Try downloading instead.',
        });
      }
    }
  }, [qrData, role, prefectNumber, getQRCodeImageData]);

  const copyQRToClipboard = useCallback(async () => {
    if (!qrData) {
      toast.error('No QR Code', {
        description: 'Please generate a QR code first',
      });
      return;
    }
    
    try {
      const pngUrl = await getQRCodeImageData();
      const blob = await (await fetch(pngUrl)).blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      toast.success('Copied to Clipboard', {
        description: 'QR code image copied to clipboard',
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Copy Failed', {
        description: 'Could not copy to clipboard. Try downloading instead.',
      });
    }
  }, [qrData, getQRCodeImageData]);

  // Initialize camera and update available status
  const initializeCamera = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices.map((device) => ({ id: device.id, label: device.label || `Camera ${device.id}` })));
      setCameraAvailable(devices.length > 0);
      if (devices.length > 0) {
        setSelectedCamera(devices[0].id);
      } else {
        // No camera available; file upload will be used for scanning.
        setCameraAvailable(false);
      }
    } catch (error) {
      setCameraAvailable(false);
      console.error('Camera initialization error:', error);
    }
  }, []);

  // Process scan result and mark attendance if valid QR code
  const onScanSuccess = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      // Validate that QR code is from our system
      if (!data || data.type !== 'prefect_attendance') {
        throw new Error('Unrecognized QR code');
      }
      
      const qrSecret = process.env.NEXT_PUBLIC_QR_SECRET || 'secret';
      let expectedHash;
      
      // Support both old and new QR code formats
      if (data.timestamp) {
        expectedHash = btoa(`${data.prefectNumber}_${data.role}_${data.timestamp}_${qrSecret}`);
      } else {
        expectedHash = btoa(`${data.prefectNumber}_${data.role}_${qrSecret}`);
      }
      
      if (data.hash !== expectedHash) {
        throw new Error('QR code signature mismatch');
      }
      
      const record = saveAttendance(data.prefectNumber, data.role);
      const time = new Date(record.timestamp);
      const isLate = time.getHours() >= 7 && time.getMinutes() > 0;
      
      // Play success sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
      
      // Add to scan history
      setScanHistory(prev => [
        {
          prefectNumber: data.prefectNumber,
          role: data.role,
          timestamp: time.toLocaleString(),
          status: isLate ? 'late' : 'success'
        },
        ...prev.slice(0, 9) // Keep only the last 10 scans
      ]);
      
      setScanSuccessCount(prev => prev + 1);
      
      toast.success('Attendance Marked Successfully', {
        description: `${data.role} ${data.prefectNumber} marked at ${time.toLocaleTimeString()}`,
      });
      
      if (isLate) {
        toast.warning('Late Arrival Detected', {
          description: 'Attendance marked as late (after 7:00 AM)',
        });
      }
      
      setIsWaitingForScan(false);
    } catch (error) {
      // Show error for invalid QR codes
      console.error('Scan processing error:', error);
      toast.error('Invalid QR Code', {
        description: error instanceof Error ? error.message : 'Failed to process QR code',
      });
    }
  }, []);

  // Silently ignore scan errors without disrupting the user experience.
  const onScanError = useCallback((error: any) => {
    // Only log for debugging, don't show to user
    console.debug('Scan error (ignored):', error);
  }, []);

  const startScanner = useCallback(async () => {
    if (!selectedCamera) return;
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;
      setIsWaitingForScan(true);
      
      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          videoConstraints: {
            width: { ideal: cameraResolution },
            height: { ideal: cameraResolution },
            facingMode: "environment"
          }
        },
        onScanSuccess,
        onScanError
      );
      
      setIsCameraActive(true);
      toast.info('Camera Active', {
        description: 'Point your camera at a valid QR code',
      });
    } catch (error) {
      console.error('Failed to start scanner:', error);
      toast.error('Scanner Error', {
        description: 'Could not start the camera. Please check permissions.',
      });
    }
  }, [selectedCamera, onScanSuccess, onScanError, cameraResolution]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsCameraActive(false);
      setIsWaitingForScan(false);
      toast.info('Camera Stopped', {
        description: 'QR code scanner has been stopped',
      });
    }
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('qr-reader');
        }
        const result = await html5QrCodeRef.current.scanFile(file, true);
        // If scanning via file upload is successful, mark attendance.
        onScanSuccess(result);
      } catch (error) {
        console.error('File upload scan error:', error);
        toast.error('Scan Failed', {
          description: 'Could not read QR code from image. Please try another image.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onScanSuccess]
  );

  useEffect(() => {
    initializeCamera();
    return () => {
      stopScanner();
    };
  }, [initializeCamera, stopScanner]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (!qrData && prefectNumber && role) {
          generateQRCode();
        } else if (!isCameraActive && cameraAvailable) {
          startScanner();
        }
      }
    },
    [qrData, prefectNumber, role, generateQRCode, isCameraActive, cameraAvailable, startScanner]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Load scan history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('scan_history');
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse scan history:', e);
      }
    }
  }, []);

  // Save scan history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('scan_history', JSON.stringify(scanHistory));
  }, [scanHistory]);

  return (
    <div className="container py-10">
      <Tabs defaultValue="generate" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Generate QR Code
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Scan QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Generate Attendance QR Code</CardTitle>
                  <CardDescription>
                    Create a QR code for prefect attendance
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowSettings(!showSettings)}
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>QR Code Settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-secondary/20 rounded-lg space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">QR Code Size</span>
                      <span className="text-sm text-muted-foreground">{qrSize}px</span>
                    </div>
                    <Slider
                      value={[qrSize]}
                      min={200}
                      max={500}
                      step={10}
                      onValueChange={(value) => setQrSize(value[0])}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Error Correction Level</span>
                      <span className="text-sm text-muted-foreground">{qrErrorLevel}</span>
                    </div>
                    <div className="flex gap-2">
                      {(["L", "M", "Q", "H"] as const).map((level) => (
                        <Button
                          key={level}
                          variant={qrErrorLevel === level ? "default" : "outline"}
                          size="sm"
                          onClick={() => setQrErrorLevel(level)}
                          className="flex-1"
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      L: Low (7%) | M: Medium (15%) | Q: Quartile (25%) | H: High (30%)
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as PrefectRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select prefect role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Enter prefect number"
                    value={prefectNumber}
                    onChange={(e) => setPrefectNumber(e.target.value)}
                  />
                </div>
                <Button
                  onClick={generateQRCode}
                  className="w-full gap-2"
                  disabled={isGenerating}
                >
                  <Shield className="h-4 w-4" />
                  {isGenerating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate QR Code'
                  )}
                </Button>
              </div>

              <AnimatePresence>
                {qrData && (
                  <motion.div
                    ref={qrContainerRef}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center space-y-4"
                  >
                    <div className="p-6 bg-white rounded-lg shadow-lg">
                      <QRCodeSVG
                        value={qrData}
                        size={qrSize}
                        level={qrErrorLevel}
                        includeMargin
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="text-center mb-2">
                      <p className="font-medium">{role} - {prefectNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Scan this code to mark attendance
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={downloadQRCode}
                              variant="outline"
                              className="gap-2"
                              disabled={isDownloading}
                            >
                              <Download className="h-4 w-4" />
                              {isDownloading ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                'Download'
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Save QR code as image</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={printQRCode}
                              variant="outline"
                              className="gap-2"
                            >
                              <Printer className="h-4 w-4" />
                              Print
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Print QR code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={shareQRCode}
                              variant="outline"
                              className="gap-2"
                            >
                              <Share2 className="h-4 w-4" />
                              Share
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Share QR code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={copyQRToClipboard}
                              variant="outline"
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy to clipboard</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Scan Attendance QR Code</CardTitle>
                  <CardDescription>
                    {cameraAvailable
                      ? 'Scan the QR code using your camera'
                      : 'Upload your QR code image to mark attendance'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Info className="h-4 w-4" />
                        <span className="hidden sm:inline">History</span>
                        {scanSuccessCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                            {scanSuccessCount}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Scan History</DialogTitle>
                        <DialogDescription>
                          Recent QR code scans and attendance records
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[400px] overflow-y-auto">
                        {scanHistory.length > 0 ? (
                          <div className="space-y-2">
                            {scanHistory.map((scan, index) => (
                              <div 
                                key={index} 
                                className={`p-3 rounded-lg ${
                                  scan.status === 'late' ? 'bg-red-500/10' : 'bg-green-500/10'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{scan.role} - {scan.prefectNumber}</span>
                                  <span className={`text-sm ${
                                    scan.status === 'late' ? 'text-red-500' : 'text-green-500'
                                  }`}>
                                    {scan.status === 'late' ? 'Late' : 'On Time'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {scan.timestamp}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            No scan history available
                          </p>
                        )}
                      </div>
                      {scanHistory.length > 0 && (
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setScanHistory([]);
                              setScanSuccessCount(0);
                            }}
                          >
                            Clear History
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowSettings(!showSettings)}
                        >
                          <Sliders className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Scanner Settings</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-secondary/20 rounded-lg space-y-4 mb-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Camera Resolution</span>
                      <span className="text-sm text-muted-foreground">{cameraResolution}p</span>
                    </div>
                    <Slider
                      value={[cameraResolution]}
                      min={480}
                      max={1080}
                      step={120}
                      onValueChange={(value) => setCameraResolution(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher resolution may improve scanning but could reduce performance
                    </p>
                  </div>
                </motion.div>
              )}

              {cameraAvailable === null ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader className="animate-spin h-8 w-8 mb-4" />
                  <p className="text-center text-sm text-muted-foreground">
                    Checking for camera availability...
                  </p>
                </div>
              ) : cameraAvailable ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Select
                      value={selectedCamera}
                      onValueChange={setSelectedCamera}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((camera) => (
                          <SelectItem key={camera.id} value={camera.id}>
                            {camera.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant={isCameraActive ? "destructive" : "default"}
                      onClick={isCameraActive ? stopScanner : startScanner}
                      className="gap-2"
                    >
                      {isCameraActive ? (
                        <>
                          <CameraOff className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>

                  <div id="qr-reader" className="overflow-hidden rounded-lg bg-black/5 min-h-[300px]" />

                  {isWaitingForScan && (
                    <div className="flex flex-col items-center mt-4">
                      <Loader className="animate-spin h-8 w-8 mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Waiting for QR scan..
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground px-2">OR</span>
                    <div className="flex-1 border-t border-border" />
                  </div>

                  <div className="flex justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload QR Code Image'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center p-8">
                    <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      No camera detected. Please upload your QR code image to mark attendance.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload QR Code Image'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 items-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Quick Tip: Press Enter to start scanning</span>
              </div>
              {scanSuccessCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>{scanSuccessCount} successful scans in this session</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}