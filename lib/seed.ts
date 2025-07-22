import { ID } from "react-native-appwrite";
import { appwriteConfig, databases, storage } from "./appwrite";
import dummyData from "./data";

interface Category {
  name: string;
  description: string;
}

interface Customization {
  name: string;
  price: number;
  type: "topping" | "side" | "size" | "crust" | string;
}

interface MenuItem {
  name: string;
  description: string;
  image_url: string;
  price: number;
  rating: number;
  calories: number;
  protein: number;
  category_name: string;
  customizations: string[];
}

interface DummyData {
  categories: Category[];
  customizations: Customization[];
  menu: MenuItem[];
}

const data = dummyData as DummyData;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearAll(collectionId: string): Promise<void> {
  try {
    const list = await databases.listDocuments(
      appwriteConfig.databaseId,
      collectionId
    );

    await Promise.all(
      list.documents.map((doc) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          collectionId,
          doc.$id
        )
      )
    );
    console.log(`✅ Cleared collection: ${collectionId}`);
  } catch (error) {
    console.error(`❌ Failed to clear collection ${collectionId}:`, error);
  }
}

async function clearStorage(): Promise<void> {
  try {
    const list = await storage.listFiles(appwriteConfig.bucketId);

    await Promise.all(
      list.files.map((file) =>
        storage.deleteFile(appwriteConfig.bucketId, file.$id)
      )
    );
    console.log("✅ Cleared storage bucket.");
  } catch (error) {
    console.error("❌ Failed to clear storage:", error);
  }
}

async function uploadImageToStorage(imageUrl: string) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const fileObj = {
      name: imageUrl.split("/").pop() || `file-${Date.now()}.jpg`,
      type: blob.type,
      size: blob.size,
      uri: imageUrl,
    };

    const file = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      fileObj
    );

    await sleep(300); // prevent rate limit
    return storage.getFileViewURL(appwriteConfig.bucketId, file.$id).toString(); // ✅ Fix here
  } catch (error) {
    console.error(`❌ Failed to upload image: ${imageUrl}`, error);
    throw error;
  }
}

async function seed(): Promise<void> {
  try {
    // Step 1: Clear all existing data
    await clearAll(appwriteConfig.categoriesCollectionId);
    await clearAll(appwriteConfig.customizationsCollectionId);
    await clearAll(appwriteConfig.menuCollectionId);
    await clearAll(appwriteConfig.menuCustomizationCollectionId);
    await clearStorage();

    // Step 2: Create categories
    const categoryMap: Record<string, string> = {};
    for (const cat of data.categories) {
      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.categoriesCollectionId,
        ID.unique(),
        cat
      );
      categoryMap[cat.name] = doc.$id;
      await sleep(200); // prevent rate limit
    }

    // Step 3: Create customizations
    const customizationMap: Record<string, string> = {};
    for (const cus of data.customizations) {
      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.customizationsCollectionId,
        ID.unique(),
        {
          name: cus.name,
          price: cus.price,
          type: cus.type,
        }
      );
      customizationMap[cus.name] = doc.$id;
      await sleep(200);
    }

    // Step 4: Create menu items
    for (const item of data.menu) {
      const categoryId = categoryMap[item.category_name];
      if (!categoryId) {
        console.warn(
          `⚠️ Skipped ${item.name}: Category '${item.category_name}' not found.`
        );
        continue;
      }

      let uploadedImage: string;
      try {
        uploadedImage = await uploadImageToStorage(item.image_url);
      } catch (error) {
        console.warn(`⚠️ Skipped ${item.name}: Image upload failed.`);
        continue;
      }

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.menuCollectionId,
        ID.unique(),
        {
          name: item.name,
          description: item.description,
          image_url: uploadedImage,
          price: item.price,
          rating: item.rating,
          calories: item.calories,
          protein: item.protein,
          categories: categoryId,
        }
      );
      await sleep(200);

      // Step 5: Link customizations
      for (const cusName of item.customizations) {
        const customizationId = customizationMap[cusName];
        if (!customizationId) {
          console.warn(
            `⚠️ Skipped customization '${cusName}' for ${item.name}`
          );
          continue;
        }

        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.menuCustomizationCollectionId,
          ID.unique(),
          {
            menu: doc.$id,
            customizations: customizationId,
          }
        );
        await sleep(200);
      }
    }

    console.log("✅ Seeding complete.");
  } catch (error) {
    console.error("❌ Failed to seed the databases", error);
  }
}

export default seed;
