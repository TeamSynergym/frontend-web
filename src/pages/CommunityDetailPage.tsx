import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchPostDetail, fetchComments, createComment, updateComment, deleteComment, likePost, unlikePost, checkPostLiked, deletePost, incrementPostViewCount, fetchPostViewCount } from '../services/api/communityApi';
import type { PostDTO, CommentDTO } from '../types/community';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Pagination from '../components/common/Pagination';
import { PostHeader, PostCounter, PostActions } from '../components/community';
import { X, ZoomIn } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import Header from '../components/common/Header';

const COMMENT_PAGE_SIZE = 10;

// 커스텀 훅: 게시글 상세 관리
const usePostDetail = (postId: number | undefined, userId: number | undefined) => {
  const [post, setPost] = useState<PostDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // 서버에서 조회수 증가 및 최신 조회수 가져오기
  const incrementViewCount = async (postId: number) => {
    try {
      // 서버에 조회수 증가 요청
      await incrementPostViewCount(postId);
      
      // 서버에서 최신 조회수 가져오기
      const updatedViewCount = await fetchPostViewCount(postId);
      setViewCount(updatedViewCount);
      
      console.log(`조회수 증가: 게시글 ${postId}, 서버 조회수: ${updatedViewCount}`);
    } catch (error) {
      console.error('조회수 증가 실패:', error);
    }
  };

  // 서버에서 최신 조회수 가져오기
  const refreshViewCount = async (postId: number) => {
    try {
      const updatedViewCount = await fetchPostViewCount(postId);
      setViewCount(updatedViewCount);
      console.log(`조회수 새로고침: 게시글 ${postId}, 서버 조회수: ${updatedViewCount}`);
    } catch (error) {
      console.error('조회수 새로고침 실패:', error);
    }
  };

  const loadPostDetail = async () => {
    if (!postId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const postData = await fetchPostDetail(postId);
      setPost(postData);
      
      // 초기 카운터 정보 설정
      setLikeCount(postData.likeCount);
      setCommentCount(postData.commentCount);
      setViewCount(postData.viewCount);
      
      // 조회수 증가 처리
      await incrementViewCount(postId);
    } catch (error) {
      setError('게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!postId || !userId) return;
    setLikeLoading(true);
    
    try {
      if (liked) {
        await unlikePost(userId, postId);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await likePost(userId, postId);
        setLikeCount(prev => prev + 1);
      }
      
      // 좋아요 상태 토글
      setLiked(!liked);
    } catch (err) {
      console.error('좋아요 처리 중 오류:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  return {
    post,
    loading,
    error,
    liked,
    likeCount,
    commentCount,
    viewCount,
    likeLoading,
    loadPostDetail,
    handleLike,
    setLiked,
    setCommentCount,
    setViewCount,
    incrementViewCount,
    refreshViewCount
  };
};

// 커스텀 훅: 댓글 관리
const useComments = (postId: number | undefined, userId: number | undefined, setCommentCount: (value: number | ((prev: number) => number)) => void) => {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [commentPage, setCommentPage] = useState(0);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadComments = async () => {
    if (!postId) return;
    
    setCommentError(null);
    
    try {
      const data = await fetchComments(postId, commentPage, COMMENT_PAGE_SIZE);
      
      // 현재 페이지가 비어있고 이전 페이지가 있다면 이전 페이지로 이동
      if (data.content?.length === 0 && commentPage > 0 && data.totalPages > 0) {
        const newPage = Math.max(0, data.totalPages - 1);
        setCommentPage(newPage);
        return;
      }
      
      setComments(data.content || []);
      setCommentTotalPages(data.totalPages || 1);
    } catch {
      setCommentError('댓글을 불러오지 못했습니다.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !postId || !userId) return;
    
    setCommentLoading(true);
    try {
      await createComment({ postId, userId, content: commentContent });
      setCommentContent('');
      setCommentPage(0);
      
      // 댓글 목록 업데이트
      await loadComments();
      
      // 댓글 개수 증가
      setCommentCount(prev => prev + 1);
    } catch {
      // 에러 처리
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
      await deleteComment(commentId);
      await loadComments();
      
      // 댓글 개수 감소
      setCommentCount(prev => Math.max(0, prev - 1));
    } catch {
      // 에러 처리
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommentId || !editingContent.trim()) return;
    
    try {
      await updateComment(editingCommentId, { content: editingContent });
      setEditingCommentId(null);
      setEditingContent('');
      await loadComments();
      // 댓글 수정은 개수에 영향 없음
    } catch {
      // 에러 처리
    }
  };

  return {
    comments,
    commentPage,
    commentTotalPages,
    commentContent,
    commentLoading,
    editingCommentId,
    editingContent,
    commentError,
    setCommentContent,
    setCommentPage,
    setEditingCommentId,
    setEditingContent,
    loadComments,
    handleCommentSubmit,
    handleDeleteComment,
    handleEditSubmit
  };
};

const CommunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const userId = user?.id;
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentListRef = useRef<HTMLDivElement>(null);

  // 이미지 모달 상태
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  // 커스텀 훅 사용
  const {
    post,
    loading,
    error,
    liked,
    likeCount,
    commentCount,
    viewCount,
    likeLoading,
    loadPostDetail,
    handleLike,
    setLiked,
    setCommentCount,
    setViewCount,
    incrementViewCount,
    refreshViewCount
  } = usePostDetail(Number(id), userId);

  // 개발자 도구에서 조회수 새로고침 함수 등록 (디버깅용)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshViewCount = () => refreshViewCount(Number(id));
      console.log('조회수 새로고침 함수가 window.refreshViewCount에 등록되었습니다.');
    }
  }, [refreshViewCount, id]);

  const {
    comments,
    commentPage,
    commentTotalPages,
    commentContent,
    commentLoading,
    editingCommentId,
    editingContent,
    commentError,
    setCommentContent,
    setCommentPage,
    setEditingCommentId,
    setEditingContent,
    loadComments,
    handleCommentSubmit,
    handleDeleteComment,
    handleEditSubmit
  } = useComments(Number(id), userId, setCommentCount);

  // 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // 게시글 로드
  useEffect(() => {
    loadPostDetail();
  }, [id]);

  // 좋아요 상태 로드
  useEffect(() => {
    if (!id || !userId) return;
    
    checkPostLiked(userId, Number(id))
      .then(likedResult => {
        setLiked(likedResult);
      })
      .catch(err => {
        console.error('좋아요 상태 로드 실패:', err);
      });
  }, [id, userId]);

  // 댓글 목록 불러오기
  useEffect(() => {
    loadComments();
  }, [id, commentPage]);

  // 댓글 입력란 자동 포커스
  useEffect(() => {
    if (commentInputRef.current) commentInputRef.current.focus();
  }, [commentPage, editingCommentId]);

  // 이미지 모달 열기
  const handleImageClick = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setShowImageModal(true);
  };

  // 이미지 모달 닫기
  const handleCloseModal = () => {
    setShowImageModal(false);
    setModalImageUrl('');
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImageModal) {
        handleCloseModal();
      }
    };
    
    if (showImageModal) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showImageModal]);

  // 댓글 등록 후 스크롤
  const scrollToNewComment = () => {
    setTimeout(() => {
      if (commentListRef.current) {
        commentListRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 200);
  };

  // 댓글 엔터 등록
  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleCommentSubmit(e);
    }
  };

  // 게시글 삭제
  const handleDeletePostWithPageAdjustment = async (postId: number, returnPath: string) => {
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
    
    try {
      await deletePost(postId);
      alert('게시글이 삭제되었습니다.');
      navigate(returnPath);
    } catch {
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  // 목록으로 돌아가기 버튼 핸들러
  const handleBack = () => {
    const returnPath = location.state?.from ? `/community${location.state.from}` : '/community';
    navigate(returnPath);
  };

  // 수정 버튼에서 현재 쿼리스트링을 state로 전달
  const goToEdit = () => {
    navigate(`/community/edit/${post?.id}`, { state: { from: location.state?.from || '' } });
  };

  if (loading) return <div className="max-w-2xl mx-auto py-8 text-center">로딩 중...</div>;
  if (error) return <div className="max-w-2xl mx-auto py-8 text-red-500 text-center">{error}</div>;
  if (!post) return <div className="max-w-2xl mx-auto py-8 text-center">게시글이 없습니다.</div>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto py-8 px-2 mt-16">
        <Card>
          <PostHeader post={post} />
          {post.imageUrl && (
            <div
              className="w-full h-80 flex items-center justify-center overflow-hidden rounded-md bg-gray-100 relative cursor-pointer group"
              style={{ minHeight: '320px', background: '#f3f4f6' }}
              onClick={() => handleImageClick(post.imageUrl)}
            >
              <img
                src={post.imageUrl}
                alt="게시글 이미지"
                className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
                style={{ display: 'block', width: 'auto', height: '100%' }}
                onError={e => { e.currentTarget.src = '/assets/logo.png'; }}
                onLoad={() => console.log('이미지 로드됨:', post.imageUrl)}
              />
              {/* 확대 아이콘 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={32} />
              </div>
            </div>
          )}
          <CardContent>
            <div className="whitespace-pre-line text-base mb-4">{post.content}</div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            {/* 첫 번째 줄: 좋아요, 댓글, 조회수 */}
            <PostCounter
              likeCount={likeCount}
              commentCount={commentCount}
              viewCount={viewCount}
              isLiked={liked}
              onLikeClick={handleLike}
              likeLoading={likeLoading}
            />

            {/* 두 번째 줄: 액션 버튼들 */}
            <PostActions
              post={post}
              currentUserId={userId}
              onBack={handleBack}
              onEdit={goToEdit}
              onDelete={() => handleDeletePostWithPageAdjustment(post.id, location.state?.from || '/community')}
            />
          </CardFooter>
        </Card>
        
        {/* 댓글 리스트, 댓글 작성 폼 등 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">댓글</h2>
          <form className="flex gap-2 mb-4" onSubmit={handleCommentSubmit} aria-label="댓글 작성">
            <input
              className="flex-1 border rounded-md px-3 py-2 text-base"
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              placeholder="댓글을 입력하세요"
              disabled={commentLoading}
              ref={commentInputRef}
              onKeyDown={handleCommentKeyDown}
              aria-label="댓글 입력"
            />
            <Button type="submit" disabled={commentLoading || !commentContent.trim()}>등록</Button>
          </form>
          {commentError && <div className="text-red-500 text-sm mb-2">{commentError}</div>}
          <div className="grid gap-3" ref={commentListRef}>
            {comments.length === 0 ? (
              <div className="text-sm text-muted-foreground">댓글이 없습니다.</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="border rounded-md px-3 py-2 bg-card flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{comment.userName}</span>
                    <span>|</span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  {editingCommentId === comment.id ? (
                    <form className="flex gap-2 mt-1" onSubmit={handleEditSubmit} aria-label="댓글 수정">
                      <input
                        className="flex-1 border rounded-md px-2 py-1 text-base"
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        aria-label="댓글 수정 입력"
                      />
                      <Button type="submit" size="sm">저장</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>취소</Button>
                    </form>
                  ) : (
                    <div className="text-base whitespace-pre-line mb-1">{comment.content}</div>
                  )}
                  {/* 본인 댓글만 수정/삭제 가능 */}
                  {comment.userId === userId && editingCommentId !== comment.id && (
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingContent(comment.content);
                      }}>수정</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(comment.id)}>삭제</Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {commentTotalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={commentPage}
                totalPages={commentTotalPages}
                onPageChange={setCommentPage}
              />
            </div>
          )}
        </div>
      </main>

      {/* 이미지 모달 */}
      {showImageModal && modalImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* 닫기 버튼 */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all duration-200 z-10"
              aria-label="이미지 모달 닫기"
            >
              <X size={24} />
            </button>
            
            {/* 확대된 이미지 */}
            <img
              src={modalImageUrl}
              alt="확대된 게시글 이미지"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                console.error('모달 이미지 로드 실패:', modalImageUrl);
                e.currentTarget.src = '/assets/logo.png';
              }}
              onLoad={() => {
                console.log('모달 이미지 로드 성공:', modalImageUrl);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDetailPage;