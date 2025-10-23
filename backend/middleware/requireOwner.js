module.exports = function (req, res, next) {
  const ownerId = req.headers["x-owner-id"];

  if (!ownerId || ownerId === "undefined") {
    return res
      .status(400)
      .json({ ok: false, error: "x-owner-id header required or invalid" });
  }

  req.owner_id = ownerId.trim();
  next();
};
