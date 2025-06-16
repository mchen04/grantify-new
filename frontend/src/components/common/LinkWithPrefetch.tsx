import Link from 'next/link';

interface LinkWithPrefetchProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function LinkWithPrefetch({ 
  href, 
  children, 
  className,
  prefetch = true 
}: LinkWithPrefetchProps) {
  return (
    <Link 
      href={href} 
      className={className}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}