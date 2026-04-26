
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION = "highscores";

export async function getHighscores() {

  try {

    const q = query(
      collection(db, COLLECTION),
      orderBy("score", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(q);

    const list = [];

    snapshot.forEach(doc => {
      list.push(doc.data());
    });

    return list;

  } catch {

    return [];

  }

}

export async function saveHighscore(name, score) {

  try {

    await addDoc(
      collection(db, COLLECTION),
      {
        name,
        score,
        created: Date.now()
      }
    );

  } catch {}

}
