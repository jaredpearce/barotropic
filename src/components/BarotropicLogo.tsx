import Image from 'next/image';
import logo from '../public/brand/barotropic-logo.svg?url';

const BarotropicLogo = () => (
  <span aria-label="Barotropic" className="app-topnav-brand" role="img">
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      width={20}
      height={20}
    />
    <span aria-hidden="true" className="app-logo-wordmark">
      barotropic
    </span>
  </span>
);

export default BarotropicLogo;
