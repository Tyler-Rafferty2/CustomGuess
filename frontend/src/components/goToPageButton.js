import { useRouter } from "next/navigation";

export default function GoToPageButton({ page, text }) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(page)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
            {text}
        </button>
    );
}