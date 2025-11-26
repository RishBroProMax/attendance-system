'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  ScanLine,
  Download,
  Share2,
  Printer,
  Copy,
  Camera,
  Upload,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PrefectRole } from '@/lib/types';
import { saveAttendance } from '@/lib/attendance';
import { roles } from '@/lib/constants';
import QRCode from 'qrcode.react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function QRPage() {
  const [role, setRole] = useState<PrefectRole | ''>('');
  const [prefectNumber, setPrefectNumber] = useState('');
  const [qrData, setQrData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scanHistory, setScanHistory] = useState<Array<{
    prefectNumber: string;
    role: string;
    timestamp: string;
    status: 'success' | 'late' | 'error';
  }>>([]);
  const [scanSuccessCount, setScanSuccessCount] = useState(0);
  const [isWaitingForScan, setIsWaitingForScan] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [qrSize, setQrSize] = useState(256);
  const [qrLevel, setQrLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [cameraResolution, setCameraResolution] = useState(480);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Helper to get QR code image data URL
  const getQRCodeImageData = useCallback(async () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('QR Code canvas not found');

    // Create a new canvas to add padding and background
    const padding = 20;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width + padding * 2;
    newCanvas.height = canvas.height + padding * 2;
    const ctx = newCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // Draw original QR code
    ctx.drawImage(canvas, padding, padding);

    // Add text label at bottom
    ctx.font = '14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(`${role} - ${prefectNumber}`, newCanvas.width / 2, newCanvas.height - 5);

    return newCanvas.toDataURL('image/png');
  }, [role, prefectNumber]);

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
  const onScanSuccess = useCallback(async (decodedText: string) => {
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

      // Await the async save
      const record = await saveAttendance(data.prefectNumber, data.role);
      const time = new Date(record.timestamp);
      const isLate = time.getHours() > 7 || (time.getHours() === 7 && time.getMinutes() > 0);

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
                <div className="p-4 rounded-lg bg-secondary/30 border border-white/10 space-y-4 mb-4">
                  <div className="flex items-center justify-between">
                    <Label>QR Code Size ({qrSize}px)</Label>
                    <Slider
                      value={[qrSize]}
                      onValueChange={(v) => setQrSize(v[0])}
                      min={128}
                      max={512}
                      step={32}
                      className="w-[60%]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Error Correction Level</Label>
                    <Select value={qrLevel} onValueChange={(v: any) => setQrLevel(v)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Low (7%)</SelectItem>
                        <SelectItem value="M">Medium (15%)</SelectItem>
                        <SelectItem value="Q">Quartile (25%)</SelectItem>
                        <SelectItem value="H">High (30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include Logo</Label>
                    <Switch
                      checked={includeLogo}
                      onCheckedChange={setIncludeLogo}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as PrefectRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prefect Number</Label>
                <Input
                  type="text"
                  placeholder="Enter your prefect number"
                  value={prefectNumber}
                  onChange={(e) => setPrefectNumber(e.target.value)}
                />
              </div>

              <Button
                onClick={generateQRCode}
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate QR Code'}
              </Button>

              {qrData && (
                <div className="flex flex-col items-center space-y-4 pt-4 border-t border-white/10">
                  <div className="p-4 bg-white rounded-lg shadow-lg">
                    <QRCode
                      value={qrData}
                      size={qrSize}
                      level={qrLevel}
                      includeMargin={true}
                      imageSettings={includeLogo ? {
                        src: "/icons/icon-192x192.png",
                        x: undefined,
                        y: undefined,
                        height: 24,
                        width: 24,
                        excavate: true,
                      } : undefined}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadQRCode} disabled={isDownloading}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={printQRCode}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareQRCode}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyQRToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle>Scan Attendance QR Code</CardTitle>
              <CardDescription>
                Use your camera to scan a prefect's QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div
                  id="qr-reader"
                  className="w-full max-w-sm aspect-square bg-black/5 rounded-lg overflow-hidden relative"
                >
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <Camera className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full max-w-sm gap-2">
                  {cameraAvailable && (
                    <div className="flex gap-2">
                      <Select value={selectedCamera} onValueChange={setSelectedCamera} disabled={isCameraActive}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Camera" />
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
                        disabled={!selectedCamera}
                      >
                        {isCameraActive ? 'Stop' : 'Start'}
                      </Button>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or upload image
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading || isCameraActive}
                      className="hidden"
                      id="qr-file-upload"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isUploading || isCameraActive}
                      onClick={() => document.getElementById('qr-file-upload')?.click()}
                    >
                      {isUploading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload QR Image
                    </Button>
                  </div>
                </div>

                {scanHistory.length > 0 && (
                  <div className="w-full max-w-sm mt-6">
                    <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
                      <span>Recent Scans</span>
                      <span className="text-xs text-muted-foreground">{scanSuccessCount} total</span>
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {scanHistory.map((scan, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded text-sm border ${scan.status === 'late'
                              ? 'bg-yellow-500/10 border-yellow-500/20'
                              : 'bg-green-500/10 border-green-500/20'
                            }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{scan.role} {scan.prefectNumber}</span>
                            <span className="text-xs opacity-70">{scan.timestamp}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${scan.status === 'late' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                            }`}>
                            {scan.status === 'late' ? 'Late' : 'On Time'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}