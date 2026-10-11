"use client";

import { useParams } from "next/navigation";
import React from "react";

const TaskId = () => {
  const params = useParams();
  console.log("🚀 ~ TaskId ~ params:", params);
  return <div></div>;
};

export default TaskId;
