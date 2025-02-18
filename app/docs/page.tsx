'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, Keyboard, Star, Info, Code, Users } from 'lucide-react';
import Image from 'next/image';

export default function Documentation() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">📖 Documentation</h1>
        
        <Tabs defaultValue="new-version">
          <TabsList className="mb-4">
            <TabsTrigger value="new-version"><Code className="mr-2 h-4 w-4" />New Version</TabsTrigger>
            <TabsTrigger value="overview"><Info className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="features"><Star className="mr-2 h-4 w-4" />Features</TabsTrigger>
            <TabsTrigger value="shortcuts"><Keyboard className="mr-2 h-4 w-4" />Keyboard Shortcuts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new-version">
            <Card>
              <CardHeader>
                <CardTitle>🚀 Version 5.0.7 Release Notes</CardTitle>
                <CardDescription>Enhanced performance, new features, and fixes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 mt-4">
                <Image src="/version7.png" alt="Version 5.0.7" width={800} height={400} className="w-full h-auto rounded-lg shadow-lg" />
                <p>
                  The latest update, <span className="font-semibold">Version 5.0.7</span>, introduces improved performance, additional role management options, and UI enhancements.
                </p>
                <h3 className="text-lg font-semibold">🆕 New Features</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Advanced Role Management</li>
                  <li>Manual Time Entry (Beta)</li>
                  <li>Enhanced Visual Elements</li>
                  <li>Clock & Manual Time Entry Enhancements</li>
                  <li>Admin Panel Password Protection</li>
                  <li>Games Captain Role</li>
                </ul>
                <h3 className="text-lg font-semibold">🐞 Fixes & Improvements</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Precision Timestamp Fix</li>
                  <li>Mobile UI Enhancements</li>
                  <li>Performance Boost</li>
                  <li>Fixed Broken Documentation Links</li>
                  <li>Memory Leak Fixes</li>
                  <li>Clearer Error Messages</li>
                  <li>Improved Keyboard Shortcuts</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>🏫 Prefect Board Attendance System</CardTitle>
                <CardDescription>Streamlined attendance management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>The Prefect Board Attendance System simplifies the process of managing attendance records for school prefects with an intuitive UI and robust admin controls.</p>
                <h3 className="text-lg font-semibold">🚀 Getting Started</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Select your role</li>
                  <li>Enter your unique prefect number</li>
                  <li>Click "Mark Attendance"</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>🛠️ Features</CardTitle>
                <CardDescription>Key functionalities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold">✅ Attendance Management</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Role-based tracking</li>
                  <li>Automatic timestamps</li>
                  <li>Late arrival detection</li>
                  <li>Real-time notifications</li>
                </ul>
                <h3 className="font-semibold">🔧 Admin Controls</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Export attendance data</li>
                  <li>Role-wise statistics</li>
                  <li>Admin panel security</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shortcuts">
            <Card>
              <CardHeader>
                <CardTitle>⌨️ Keyboard Shortcuts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between"><span>Head</span><kbd className="px-2 py-1 bg-muted rounded">1</kbd></div>
                  <div className="flex items-center justify-between"><span>Deputy</span><kbd className="px-2 py-1 bg-muted rounded">2</kbd></div>
                  <div className="flex items-center justify-between"><span>Senior Executive</span><kbd className="px-2 py-1 bg-muted rounded">3</kbd></div>
                  <div className="flex items-center justify-between"><span>Executive</span><kbd className="px-2 py-1 bg-muted rounded">4</kbd></div>
                  <div className="flex items-center justify-between"><span>Super Senior</span><kbd className="px-2 py-1 bg-muted rounded">5</kbd></div>
                  <div className="flex items-center justify-between"><span>Senior</span><kbd className="px-2 py-1 bg-muted rounded">6</kbd></div>
                  <div className="flex items-center justify-between"><span>Junior</span><kbd className="px-2 py-1 bg-muted rounded">7</kbd></div>
                  <div className="flex items-center justify-between"><span>Sub</span><kbd className="px-2 py-1 bg-muted rounded">8</kbd></div>
                  <div className="flex items-center justify-between"><span>Apprentice</span><kbd className="px-2 py-1 bg-muted rounded">9</kbd></div>
                  <div className="flex items-center justify-between"><span>Games Captain</span><kbd className="px-2 py-1 bg-muted rounded">0</kbd></div>
                  <div className="flex items-center justify-between"><span>Toggle Shortcuts</span><kbd className="px-2 py-1 bg-muted rounded">?</kbd></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
