import User from "../models/User.js";

export const MATRIX_POSITIONS = {
  LEFT: "left",
  RIGHT: "right",
};

async function getChildrenMap(parentIds) {
  const children = await User.find({ matrixParent: { $in: parentIds } })
    .select("_id matrixParent matrixPosition matrixDepth")
    .sort({ matrixPosition: 1, createdAt: 1 })
    .lean();

  const map = new Map();

  for (const child of children) {
    const key = String(child.matrixParent);
    const list = map.get(key) || [];
    list.push(child);
    map.set(key, list);
  }

  return map;
}

export async function findNextMatrixSlot(rootUserId = null) {
  const roots = rootUserId
    ? await User.find({ _id: rootUserId })
        .select("_id matrixDepth createdAt")
        .lean()
    : await User.find({ matrixParent: null })
        .select("_id matrixDepth createdAt")
        .sort({ createdAt: 1 })
        .lean();

  if (!roots.length) {
    return { parent: null, position: "", depth: 0 };
  }

  let currentLevel = roots;

  while (currentLevel.length) {
    const childMap = await getChildrenMap(currentLevel.map((user) => user._id));
    const nextLevel = [];

    for (const parent of currentLevel) {
      const children = childMap.get(String(parent._id)) || [];
      const hasLeft = children.some((child) => child.matrixPosition === MATRIX_POSITIONS.LEFT);
      const hasRight = children.some((child) => child.matrixPosition === MATRIX_POSITIONS.RIGHT);

      if (!hasLeft) {
        return {
          parent,
          position: MATRIX_POSITIONS.LEFT,
          depth: Number(parent.matrixDepth || 0) + 1,
        };
      }

      if (!hasRight) {
        return {
          parent,
          position: MATRIX_POSITIONS.RIGHT,
          depth: Number(parent.matrixDepth || 0) + 1,
        };
      }

      const sortedChildren = [...children].sort((a, b) => {
        if (a.matrixPosition === b.matrixPosition) return 0;
        return a.matrixPosition === MATRIX_POSITIONS.LEFT ? -1 : 1;
      });

      nextLevel.push(...sortedChildren);
    }

    currentLevel = nextLevel;
  }

  return { parent: null, position: "", depth: 0 };
}

export function getMatrixPlacementFields(slot) {
  return {
    matrixParent: slot?.parent?._id || null,
    matrixPosition: slot?.position || "",
    matrixDepth: Number(slot?.depth || 0),
  };
}

export async function ensureUserMatrixPlacement(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Kullanici bulunamadi");
  }

  if (user.role === "superadmin" || user.matrixParent || !user.sponsor) {
    return user;
  }

  const slot = await findNextMatrixSlot(user.sponsor);
  Object.assign(user, getMatrixPlacementFields(slot));
  await user.save();

  return user;
}
