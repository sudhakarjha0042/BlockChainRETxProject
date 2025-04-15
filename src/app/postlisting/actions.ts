"use server";

import { revalidatePath } from "next/cache";

export async function submitListing(formData: FormData) {
  // Simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Here you would typically save the data to your database
  // For this example, we'll just log it to the console
  console.log("Submitted listing:", Object.fromEntries(formData));

  // Revalidate the listings page
  revalidatePath("/listings");

  return { success: true };
}
