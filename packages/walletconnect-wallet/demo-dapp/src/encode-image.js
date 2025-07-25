// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import https from "https";

const imageUrl = "https://images.mirror-media.xyz/publication-images/Lx_fohJ8ttprQ3DmDKU9N.png?height=2048&width=2048";

https
  .get(imageUrl, (res) => {
    const data = [];

    res.on("data", (chunk) => {
      data.push(chunk);
    });

    res.on("end", () => {
      const buffer = Buffer.concat(data);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;
      console.log(dataUrl); // ✅ Copy this for your HTML
    });
  })
  .on("error", (err) => {
    console.error("Error fetching image:", err);
  });
