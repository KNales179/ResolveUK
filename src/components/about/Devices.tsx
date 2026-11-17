// Resolve UK on a laptop, a tablet and a phone: real screenshots of the site (public/devices/*.webp,
// made from the running site) in simple CSS device frames, side by side. Each device has a light and
// a dark shot and shows the one that matches the page's theme. Adapted from the Fico landing page.

function Shot({ name, alt }: { name: 'laptop' | 'tablet' | 'phone'; alt: string }) {
  return (
    <>
      <img src={`/devices/${name}-light.webp`} alt={alt} loading="lazy" decoding="async" className="theme-light-only block size-full object-cover object-top" />
      <img src={`/devices/${name}-dark.webp`} alt={alt} loading="lazy" decoding="async" className="theme-dark-only block size-full object-cover object-top" />
    </>
  )
}

export function Devices() {
  return (
    <div className="relative mx-auto aspect-[16/12] w-full max-w-5xl" role="img" aria-label="Resolve UK on a laptop, a tablet and a phone">
      <div className="hover-device absolute left-1/2 top-0 w-[86%] -translate-x-1/2 sm:w-[68%]">
        <div className="device-bezel overflow-hidden rounded-t-[1.1rem] border-[0.55rem] border-b-[0.8rem]">
          <div className="aspect-[16/10] overflow-hidden rounded-[0.25rem]">
            <Shot name="laptop" alt="The Resolve UK homepage on a laptop" />
          </div>
        </div>
        <div className="device-base mx-auto h-[0.85rem] w-[112%] -translate-x-[5.4%] rounded-b-[1.2rem]">
          <div className="mx-auto h-[0.3rem] w-[16%] rounded-b-md bg-black/25" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 left-0 w-[40%] overflow-hidden rounded-[1.4rem] border-[0.5rem] shadow-2xl sm:w-[32%]">
        <div className="aspect-[820/1180] overflow-hidden rounded-[0.8rem]">
          <Shot name="tablet" alt="Reported problems on a tablet" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 right-0 w-[28%] overflow-hidden rounded-[1.6rem] border-[0.42rem] shadow-2xl sm:right-[2%] sm:w-[21%]">
        <div className="relative flex aspect-[600/1360] flex-col overflow-hidden rounded-[1.15rem] bg-bg">
          <div className="relative h-[4.6%] shrink-0" aria-hidden="true">
            <span className="absolute left-1/2 top-1/2 h-[55%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
          </div>
          <div className="min-h-0 flex-1">
            <Shot name="phone" alt="Reporting a problem on a phone" />
          </div>
        </div>
      </div>
    </div>
  )
}
