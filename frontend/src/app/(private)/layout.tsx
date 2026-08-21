import PrivateAuthGuard from "./PrivateAuthGuard";

type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return <PrivateAuthGuard>{children}</PrivateAuthGuard>;
}
