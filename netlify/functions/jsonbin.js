// netlify/functions/jsonbin.js
//
// Proxy sécurisé entre le site AJESA et JSONBin.io
// La clé secrète JSONBin ne vit JAMAIS dans le navigateur du visiteur :
// elle est lue ici, côté serveur, depuis une variable d'environnement Netlify.
//
// Le site appelle désormais : /.netlify/functions/jsonbin
// au lieu de : https://api.jsonbin.io/v3/b/...
//
// Body attendu (JSON) :
// {
//   "action": "read" | "write" | "create",
//   "binId": "xxxxx"        // requis pour "read" et "write"
//   "binName": "ajesa-xxx", // requis pour "create"
//   "data": { ... }         // requis pour "write" et "create"
// }

exports.handler = async (event) => {
  // On n'accepte que du POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const JKEY = process.env.JSONBIN_KEY; // définie dans Netlify > Site settings > Environment variables
  if (!JKEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Clé JSONBin manquante côté serveur" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Corps de requête invalide" }) };
  }

  const { action, binId, binName, data } = payload;

  try {
    if (action === "read") {
      if (!binId) return { statusCode: 400, body: JSON.stringify({ error: "binId requis" }) };
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { "X-Master-Key": JKEY }
      });
      const json = await res.json();
      return { statusCode: res.status, body: JSON.stringify(json) };
    }

    if (action === "write") {
      if (!binId) return { statusCode: 400, body: JSON.stringify({ error: "binId requis" }) };
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": JKEY },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      return { statusCode: res.status, body: JSON.stringify(json) };
    }

    if (action === "create") {
      if (!binName) return { statusCode: 400, body: JSON.stringify({ error: "binName requis" }) };
      const res = await fetch("https://api.jsonbin.io/v3/b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JKEY,
          "X-Bin-Name": binName,
          "X-Bin-Private": "false"
        },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      return { statusCode: res.status, body: JSON.stringify(json) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "action inconnue" }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
