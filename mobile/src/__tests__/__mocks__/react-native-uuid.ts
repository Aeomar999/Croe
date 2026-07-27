let counter = 0;

const uuid = {
  v4: () => {
    counter++;
    return `test-uuid-${counter}-0000-4000-8000-000000000000`;
  },
  reset: () => {
    counter = 0;
  },
};

export default uuid;
