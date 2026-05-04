import argparse

def custom_args(demo_datapath = 'data/preprocessed_xia_test', cnt_clip = 'angry_13_000', sty_clip = 'strutting_16_000'):
    parser = argparse.ArgumentParser(description='Testing MoST')

    parser.add_argument('--gpus', type=int, default=1)
    parser.add_argument('--num_frame', type=int, default=200)
    parser.add_argument('--dim_emb', type=int, default=48)
    parser.add_argument('--num_heads', type=int, default=4)
    parser.add_argument('--num_enc_blocks', type=int, default=2)
    parser.add_argument('--num_dec_blocks', type=int, default=3)
    parser.add_argument('--num_disc_blocks', type=int, default=1)

    parser.add_argument('--model_path', type=str, default='back/pretrained/xia_pretrained.pth')
    parser.add_argument('--dist_datapath', type=str, default='data/preprocessed_xia/distribution.npz', help='data mean and std path')
    parser.add_argument('--demo_datapath', type=str, default=demo_datapath, help='demo data path')
    parser.add_argument('--cnt_clip', type=str, default=cnt_clip, help='input content clip name')
    parser.add_argument('--sty_clip', type=str, default=sty_clip, help='input style clip name')

    # 使用 parse_known_args() 忽略未知参数（如 uvicorn 的 --host --port）
    args, _ = parser.parse_known_args()
    return args