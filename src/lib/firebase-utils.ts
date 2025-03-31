
import { ref, set, push, get, remove, query, orderByChild } from "firebase/database";
import { database } from "@/integrations/firebase/config";
import { Resource, Video, Offer } from "@/lib/models";
import { v4 as uuidv4 } from "uuid";

// Resources
export async function fetchResourcesFromFirebase(): Promise<Resource[]> {
  try {
    console.log("Fetching resources from Firebase");
    const resourcesRef = ref(database, 'resources');
    const snapshot = await get(resourcesRef);
    
    if (!snapshot.exists()) {
      console.log("No resources found in Firebase");
      return [];
    }
    
    const data = snapshot.val();
    console.log("Firebase resources data received:", Object.keys(data).length, "resources");
    
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } catch (error) {
    console.error("Error fetching resources from Firebase:", error);
    throw error;
  }
}

export async function createResourceInFirebase(resource: Partial<Resource>): Promise<void> {
  try {
    console.log("Creating resource in Firebase:", resource);
    
    if (!resource.title || !resource.url || !resource.type) {
      throw new Error('Title, URL, and type are required for resources');
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newResource = {
      id,
      title: resource.title,
      description: resource.description || '',
      url: resource.url,
      type: resource.type,
      created_at: now
    };
    
    const resourceRef = ref(database, `resources/${id}`);
    await set(resourceRef, newResource);
    
    console.log("Resource created successfully in Firebase:", id);
  } catch (error) {
    console.error("Error creating resource in Firebase:", error);
    throw error;
  }
}

export async function updateResourceInFirebase(id: string, resource: Partial<Resource>): Promise<void> {
  try {
    console.log("Updating resource in Firebase:", id, resource);
    
    // Get the existing resource first
    const resourceRef = ref(database, `resources/${id}`);
    const snapshot = await get(resourceRef);
    
    if (!snapshot.exists()) {
      throw new Error('Resource not found');
    }
    
    const existingResource = snapshot.val();
    
    // Update with new values
    const updatedResource = {
      ...existingResource,
      ...resource,
    };
    
    await set(resourceRef, updatedResource);
    console.log("Resource updated successfully in Firebase:", id);
  } catch (error) {
    console.error("Error updating resource in Firebase:", error);
    throw error;
  }
}

export async function deleteResourceFromFirebase(id: string): Promise<void> {
  try {
    console.log("Deleting resource from Firebase:", id);
    const resourceRef = ref(database, `resources/${id}`);
    await remove(resourceRef);
    console.log("Resource deleted successfully from Firebase:", id);
  } catch (error) {
    console.error("Error deleting resource from Firebase:", error);
    throw error;
  }
}

// Videos
export async function fetchVideosFromFirebase(): Promise<Video[]> {
  try {
    console.log("Fetching videos from Firebase");
    const videosRef = ref(database, 'videos');
    const snapshot = await get(videosRef);
    
    if (!snapshot.exists()) {
      console.log("No videos found in Firebase");
      return [];
    }
    
    const data = snapshot.val();
    console.log("Firebase videos data received:", Object.keys(data).length, "videos");
    
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } catch (error) {
    console.error("Error fetching videos from Firebase:", error);
    throw error;
  }
}

export async function createVideoInFirebase(video: Partial<Video>): Promise<void> {
  try {
    console.log("Creating video in Firebase:", video);
    
    if (!video.title || !video.youtube_id) {
      throw new Error('Title and YouTube ID are required for videos');
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newVideo = {
      id,
      title: video.title,
      description: video.description || '',
      youtube_id: video.youtube_id,
      created_at: now
    };
    
    const videoRef = ref(database, `videos/${id}`);
    await set(videoRef, newVideo);
    
    console.log("Video created successfully in Firebase:", id);
  } catch (error) {
    console.error("Error creating video in Firebase:", error);
    throw error;
  }
}

export async function updateVideoInFirebase(id: string, video: Partial<Video>): Promise<void> {
  try {
    console.log("Updating video in Firebase:", id, video);
    
    const videoRef = ref(database, `videos/${id}`);
    const snapshot = await get(videoRef);
    
    if (!snapshot.exists()) {
      throw new Error('Video not found');
    }
    
    const existingVideo = snapshot.val();
    
    const updatedVideo = {
      ...existingVideo,
      ...video,
    };
    
    await set(videoRef, updatedVideo);
    console.log("Video updated successfully in Firebase:", id);
  } catch (error) {
    console.error("Error updating video in Firebase:", error);
    throw error;
  }
}

export async function deleteVideoFromFirebase(id: string): Promise<void> {
  try {
    console.log("Deleting video from Firebase:", id);
    const videoRef = ref(database, `videos/${id}`);
    await remove(videoRef);
    console.log("Video deleted successfully from Firebase:", id);
  } catch (error) {
    console.error("Error deleting video from Firebase:", error);
    throw error;
  }
}

// Offers
export async function fetchOffersFromFirebase(): Promise<Offer[]> {
  try {
    console.log("Fetching offers from Firebase");
    const offersRef = ref(database, 'offers');
    const snapshot = await get(offersRef);
    
    if (!snapshot.exists()) {
      console.log("No offers found in Firebase");
      return [];
    }
    
    const data = snapshot.val();
    console.log("Firebase offers data received:", Object.keys(data).length, "offers");
    
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } catch (error) {
    console.error("Error fetching offers from Firebase:", error);
    throw error;
  }
}

export async function createOfferInFirebase(offer: Partial<Offer>): Promise<void> {
  try {
    console.log("Creating offer in Firebase:", offer);
    
    if (!offer.title || !offer.valid_until) {
      throw new Error('Title and valid until date are required for offers');
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newOffer = {
      id,
      title: offer.title,
      description: offer.description || '',
      code: offer.code,
      discount_percentage: offer.discount_percentage,
      valid_until: offer.valid_until,
      created_at: now
    };
    
    const offerRef = ref(database, `offers/${id}`);
    await set(offerRef, newOffer);
    
    console.log("Offer created successfully in Firebase:", id);
  } catch (error) {
    console.error("Error creating offer in Firebase:", error);
    throw error;
  }
}

export async function updateOfferInFirebase(id: string, offer: Partial<Offer>): Promise<void> {
  try {
    console.log("Updating offer in Firebase:", id, offer);
    
    const offerRef = ref(database, `offers/${id}`);
    const snapshot = await get(offerRef);
    
    if (!snapshot.exists()) {
      throw new Error('Offer not found');
    }
    
    const existingOffer = snapshot.val();
    
    const updatedOffer = {
      ...existingOffer,
      ...offer,
    };
    
    await set(offerRef, updatedOffer);
    console.log("Offer updated successfully in Firebase:", id);
  } catch (error) {
    console.error("Error updating offer in Firebase:", error);
    throw error;
  }
}

export async function deleteOfferFromFirebase(id: string): Promise<void> {
  try {
    console.log("Deleting offer from Firebase:", id);
    const offerRef = ref(database, `offers/${id}`);
    await remove(offerRef);
    console.log("Offer deleted successfully from Firebase:", id);
  } catch (error) {
    console.error("Error deleting offer from Firebase:", error);
    throw error;
  }
}
