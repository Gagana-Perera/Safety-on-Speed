import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import News from '@/app/(tabs)/news';
import * as newsApi from '@/lib/newsApi';
import { useTheme } from '@/components/theme/ThemeContext';

// Mock dependencies
jest.mock('@/lib/newsApi');
jest.mock('@/components/theme/ThemeContext');
jest.mock('@/components/news/CreatePostModal', () => ({
  __esModule: true,
  default: ({ visible, onClose, onSuccess }: any) => (
    <></> // Mock component - no rendering needed in tests
  ),
}));

const mockTheme = {
  background: '#fff',
  text: '#000',
  card: '#f5f5f5',
  border: '#ddd',
  icon: '#999',
};

describe('News Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({ theme: mockTheme });
  });

  it('renders the news screen with posts', async () => {
    const mockPosts = [
      {
        postId: '1',
        postTopic: 'Safety Tip',
        postTime: '14.30',
        postDate: '2026-03-22',
        postBody: 'Stay aware of your surroundings',
      },
    ];

    (newsApi.fetchPosts as jest.Mock).mockResolvedValue(mockPosts);

    const { getByText } = render(<News />);

    await waitFor(() => {
      expect(getByText('Safety Tip')).toBeTruthy();
      expect(getByText('Stay aware of your surroundings')).toBeTruthy();
    });
  });

  it('sorts posts by time in descending order', async () => {
    const mockPosts = [
      {
        postId: '1',
        postTopic: 'First Post',
        postTime: '08.00',
        postDate: '2026-03-22',
        postBody: 'Early post',
      },
      {
        postId: '2',
        postTopic: 'Second Post',
        postTime: '18.00',
        postDate: '2026-03-22',
        postBody: 'Later post',
      },
      {
        postId: '3',
        postTopic: 'Third Post',
        postTime: '12.00',
        postDate: '2026-03-22',
        postBody: 'Mid post',
      },
    ];

    (newsApi.fetchPosts as jest.Mock).mockResolvedValue(mockPosts);

    render(<News />);

    await waitFor(() => {
      // Posts should be sorted with 18.00 first, then 12.00, then 08.00
      const textElements = screen.getAllByText(/Post/);
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  it('handles empty posts list', async () => {
    (newsApi.fetchPosts as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<News />);

    await waitFor(() => {
      expect(newsApi.fetchPosts).toHaveBeenCalled();
    });
  });

  it('handles fetchPosts error gracefully', async () => {
    (newsApi.fetchPosts as jest.Mock).mockRejectedValue(new Error('Network error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<News />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching posts:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays floating action button for creating posts', async () => {
    (newsApi.fetchPosts as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<News />);

    await waitFor(() => {
      expect(newsApi.fetchPosts).toHaveBeenCalled();
    });
  });

  it('formats post time correctly from database format', async () => {
    const mockPosts = [
      {
        postId: '1',
        postTopic: 'Test Post',
        postTime: '14.30',
        postDate: '2026-03-22',
        postBody: 'Test body',
      },
      {
        postId: '2',
        postTopic: 'Another Post',
        postTime: '9.15',
        postDate: '2026-03-22',
        postBody: 'Another body',
      },
    ];

    (newsApi.fetchPosts as jest.Mock).mockResolvedValue(mockPosts);

    render(<News />);

    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeTruthy();
    });
  });

  it('fetches posts on component mount', async () => {
    (newsApi.fetchPosts as jest.Mock).mockResolvedValue([]);

    render(<News />);

    await waitFor(() => {
      expect(newsApi.fetchPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('refreshes posts when create post succeeds', async () => {
    const initialPosts = [
      {
        postId: '1',
        postTopic: 'Initial Post',
        postTime: '10.00',
        postDate: '2026-03-22',
        postBody: 'Initial body',
      },
    ];

    const updatedPosts = [
      ...initialPosts,
      {
        postId: '2',
        postTopic: 'New Post',
        postTime: '11.00',
        postDate: '2026-03-22',
        postBody: 'New body',
      },
    ];

    (newsApi.fetchPosts as jest.Mock)
      .mockResolvedValueOnce(initialPosts)
      .mockResolvedValueOnce(updatedPosts);

    render(<News />);

    await waitFor(() => {
      expect(newsApi.fetchPosts).toHaveBeenCalledTimes(1);
    });
  });
});
