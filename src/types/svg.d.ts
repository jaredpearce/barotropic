declare module '*.svg' {
  import type { FC, SVGProps } from 'react';

  const component: FC<SVGProps<SVGSVGElement>>;
  export default component;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

declare module '*.svg?component' {
  import type { FC, SVGProps } from 'react';

  const component: FC<SVGProps<SVGSVGElement>>;
  export default component;
}
