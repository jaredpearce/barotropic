import Image from 'next/image';
import logo from '../public/brand/barotropic-logo.svg?url';

const BarotropicLogo = () => (
  <span aria-label="Barotropic" className="inline-flex items-center gap-2" role="img">
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      className="h-6 w-6 shrink-0"
      width={24}
      height={24}
    />
    <span aria-hidden="true" className="app-header-title">
      barotropic
    </span>
  </span>
);

export default BarotropicLogo;
