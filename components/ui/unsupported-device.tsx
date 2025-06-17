export function UnsupportedDevice() {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded shadow-md">
          <h1 className="text-2xl font-bold mb-4">Unsupported Device</h1>
          <p className="mb-4">
            Unfortunately, your device does not support the features required to use this application.
          </p>
          <p>Please try accessing the site from a different device.</p>
        </div>
      </div>
    );
  }