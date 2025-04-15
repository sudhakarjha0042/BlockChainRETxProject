import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a New Listing | Web3 Realty",
  description: "List your property on our Web3 real estate platform",
};

export default function PostListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen ">
      <main className="pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
