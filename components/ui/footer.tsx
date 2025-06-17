export function Footer() {
  return (
    <footer className="w-full border-t bg-black">
      <div className="container mx-auto px-4 py-4 flex flex-col items-center">
        <p className="text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} <a href="https://rylix.imrishmika.site" className="text-white hover:no-underline">Rylix Solution</a> & <a href="https://imrishmika.site" className="text-white hover:no-underline">ImRishmika</a>. All rights reserved. This is Made For Prefect Board of MRCM.
        </p>
      </div>
    </footer>
  );
}