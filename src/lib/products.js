const cdn = "https://demo-gecko6.myshopify.com/cdn/shop";

export const products = [
  {
    // id: "blue-cotton-leggings",
    // title: "Blue Cotton Leggings",
    // // image: `${cdn}/products/p-46_1a4bbde3-f6bf-47e7-a830-ff8b7616c644.jpg?v=1665680803&width=700`,
    // oldPrice: "$50.00",
    // price: "$30.00",
    // description: "Soft stretch cotton leggings with a clean everyday fit.",
    // sizes: ["2Y", "4Y", "6Y", "8Y"],
    // colors: ["#6c98d8", "#b94b43", "#64c8d8", "#111", "#e9b4c6", "#b8b8b8", "#7a4e35"],
  },
  {
    // id: "ribbed-bodycon-dress",
    // title: "Ribbed Bodycon Dress",
    // image: `${cdn}/products/g-01.jpg?v=1665680795&width=700`,
    // price: "$30.00",
    // description: "A polished ribbed dress for parties, photos, and special days.",
    // sizes: ["3Y", "5Y", "7Y", "9Y"],
    // colors: ["#111", "#b59677", "#cfcfcf"],
  },
  {
    // id: "cyan-cuffed-chino-shorts",
    // title: "Cyan Cuffed Chino Shorts",
    // image: `${cdn}/products/m-12_8f3d8497-a3c0-4f95-b5f6-88c85ee39b8e.jpg?v=1665680789&width=700`,
    // oldPrice: "$25.00",
    // price: "$20.00",
    // description: "Cuffed chino shorts with a bright summer color story.",
    // sizes: ["2Y", "4Y", "6Y", "8Y"],
    // colors: ["#78d4dc", "#999", "#c34d43", "#d8d8d8", "#d7c24d"],
  },
  {
    // id: "black-cotton-leggings",
    // title: "Black Cotton Leggings",
    // image: `${cdn}/products/p-41_ded061b9-35d1-4574-8f0a-476316933a0b.jpg?v=1665680783&width=700`,
    // price: "$30.00",
    // description: "A wardrobe essential with smooth cotton comfort.",
    // sizes: ["2Y", "4Y", "6Y", "8Y", "10Y"],
    // colors: ["#111", "#6c98d8", "#b94b43"],
  },
  {
    // id: "red-cotton-leggings",
    // title: "Red Cotton Leggings",
    // image: `${cdn}/products/p-45_92e6d9ce-1d2d-4820-a190-4c534313fb58.jpg?v=1665680779&width=700`,
    // price: "$30.00",
    // description: "Bright cotton leggings designed for easy mix-and-match styling.",
    // sizes: ["2Y", "4Y", "6Y", "8Y"],
    // colors: ["#b94b43", "#6c98d8", "#111", "#7a4e35", "#64c8d8", "#999", "#e9b4c6"],
  },
  {
    // id: "grey-cotton-leggings",
    // title: "Grey Cotton Leggings",
    // image: `${cdn}/products/p-44_973e9674-d323-4e80-8eed-5918e9a54e49.jpg?v=1665680770&width=700`,
    // oldPrice: "$20.00",
    // price: "$15.00",
    // description: "Soft grey leggings with a flexible pull-on waistband.",
    // sizes: ["2Y", "4Y", "6Y"],
    colors: ["#a7a7a7"],
  },
];

export function getProductById(id) {
  return products.find((product) => product.id === id);
}

export function parsePrice(price) {
  return Number(price.replace(/[^0-9.]/g, ""));
}

export function formatPrice(value) {
  return `₹${value.toFixed(2)}`;
}
